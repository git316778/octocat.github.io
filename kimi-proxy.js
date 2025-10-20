require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const KIMI_KEY = process.env.KIMI_KEY;
if (!KIMI_KEY) throw new Error('请配置环境变量 KIMI_KEY');

// 允许前端跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 唯一接口
app.post('/kimi-proxy', async (req, res) => {
  const { keywords, imgCount, videoCount, onlyCC0, sources } = req.body;

  // 拼装提示词
  const prompt = `
请扮演“竖屏素材爬虫”，严格按下面规则返回 JSON 数组，不要多余解释。
规则：
1. 每条字段：keyword, type(video/image), url(直链), preview(缩略图), resolution, duration(秒), source, license。
2. 保证所有 url 可公开访问、且标注“可商用”。
3. 返回数量：${imgCount} 张图 + ${videoCount} 条视频，共 ${imgCount + videoCount} 条。
4. 关键词：${keywords.join('、')}。
5. 平台：${sources.join('、')}。
6. ${onlyCC0 ? '仅返回 CC0 授权' : '优先返回 CC0，如无则注明出处'}。

返回格式示例：
[
  {"keyword":"浙大","type":"image","url":"https://xxx.jpg","preview":"https://xxx_s.jpg","resolution":"1080x1920","duration":"-","source":"抖音","license":"CC0"},
  ...
]
`;

  try {
    const { data } = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      },
      { headers: { Authorization: `Bearer ${KIMI_KEY}` } }
    );

    // 提取 markdown 代码块里的 JSON
    const raw = data.choices[0].message.content;
    const jsonStr = raw.match(/\[([\s\S]*)\]/)[0];
    const list = JSON.parse(jsonStr);

    console.log('[kimi-proxy] 返回条数:', list.length);
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Kimi 调用失败：' + e.message });
  }
});

app.listen(3000, () => console.log('Kimi 本地代理已启动 http://localhost:3000'));
