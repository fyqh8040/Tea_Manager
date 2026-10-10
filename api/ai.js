import { GoogleGenAI } from '@google/genai';

/**
 * 侍茶师内置离线专家知识引擎 (零 API Key / 零门槛纯免费运行)
 * 具备完备的中国六大茶类、年份陈化规律、宜兴紫砂泥料适茶性及二十四节气品饮知识图谱
 */
function runBuiltinExpertEngine(action, payload) {
  const teas = payload.collectionSummary?.teas || [];
  const wares = payload.collectionSummary?.wares || [];

  if (action === 'chat') {
    const messages = payload.messages || [];
    const query = messages[messages.length - 1]?.content || '';
    const qLower = query.toLowerCase();

    // 1. 优先在用户真实藏品库中检索相关茶叶
    const matchedTeas = teas.filter((t) => {
      return (
        query.includes(t.name) ||
        (t.category && query.includes(t.category)) ||
        (t.origin && query.includes(t.origin))
      );
    });

    // 2. 检索相关茶器
    const matchedWares = wares.filter((w) => {
      return (
        query.includes(w.name) ||
        (w.material && query.includes(w.material)) ||
        (w.category && query.includes(w.category))
      );
    });

    let reply = '';

    // A. 晚间 / 助眠 / 怕失眠 / 暖胃
    if (
      qLower.includes('晚') ||
      qLower.includes('夜') ||
      qLower.includes('睡') ||
      qLower.includes('失眠') ||
      qLower.includes('胃寒') ||
      qLower.includes('暖胃')
    ) {
      const warmTeas = teas.filter((t) => {
        const cat = t.category || '';
        return (
          cat.includes('熟普') ||
          cat.includes('黑茶') ||
          cat.includes('老白茶') ||
          cat.includes('红茶') ||
          (t.year && parseInt(t.year) < 2018)
        );
      });
      const purplePot = wares.find(
        (w) =>
          (w.material && (w.material.includes('紫泥') || w.material.includes('段泥'))) ||
          w.category === '紫砂壶'
      );

      const targetTea = warmTeas[0] || teas[0];
      reply = `🍵 **【夜间温润侍茶方案】**\n\n夜间品茗重在“温和少刺激、安神不扰眠”。生普与绿茶茶多酚高扬，夜饮易滞胃失眠；宜选发酵度深或年份醇化的陈茶。\n\n`;

      if (targetTea) {
        reply += `📌 **私房藏品甄选推荐**：\n• **【${targetTea.name}】**（${targetTea.category || '陈茶'}，存量: ${targetTea.quantity}${targetTea.unit}）\n`;
        if (targetTea.year) reply += `  - 仓储年份：${targetTea.year}年，经岁月陈化，茶性温和醇润。\n`;
      } else {
        reply += `📌 **建议选茶**：五年以上老白茶、熟普金芽或陈年茯砖黑茶。\n`;
      }

      if (purplePot) {
        reply += `• **适宜配器**：您藏库中的【${purplePot.name}】（${purplePot.material || '紫砂'}，${purplePot.capacity_ml ? purplePot.capacity_ml + 'ml' : '小品'}），气孔率高透气聚热，最宜逼出醇陈甜润。\n\n`;
      } else {
        reply += `• **适宜配器**：建议选用原矿紫泥或段泥紫砂壶，保温性佳，能消减陈茶杂味。\n\n`;
      }

      reply += `💧 **侍茶参数**：\n- **投茶比**：1:22（约 6.5~7g，投茶宜稍轻）\n- **水温**：100℃ 沸水醒茶5秒倒尽\n- **出汤节拍**：前三泡 8~12 秒出汤，汤色红浓透亮，入口糯滑温胃。`;
      return { reply, isFallback: true };
    }

    // B. 解腻 / 饭后 / 促消化
    if (
      qLower.includes('解腻') ||
      qLower.includes('饭后') ||
      qLower.includes('肉') ||
      qLower.includes('饱') ||
      qLower.includes('消化')
    ) {
      const digestTeas = teas.filter((t) => {
        const cat = t.category || '';
        return (
          cat.includes('生普') ||
          cat.includes('岩茶') ||
          cat.includes('单丛') ||
          cat.includes('黑茶') ||
          cat.includes('乌龙')
        );
      });
      const targetTea = digestTeas[0] || teas[0];

      reply = `🍃 **【饭后化滞消食茶席】**\n\n餐后半小时宜饮具有高茶多酚活性的古树生茶或重发酵重焙火岩茶，能生津消滞、清畅齿颊。\n\n`;
      if (targetTea) {
        reply += `📌 **从您的私房藏品中优选**：\n• **【${targetTea.name}】**（${targetTea.category}）\n  - 此茶香气深沉、回甘迅速，刮油解腻立竿见影。\n\n`;
      } else {
        reply += `📌 **品饮建议**：武夷大红袍、易武古树生普或凤凰单丛。\n\n`;
      }
      reply += `💧 **冲泡指南**：\n- **器皿**：白瓷盖碗（110ml~130ml）最佳，高冲聚香，散热适度不闷香；\n- **水温**：98℃~100℃ 沸水定点细流冲注；\n- **节拍**：即冲即出，感受开汤时的幽兰岩韵与两颊生津鸣泉。`;
      return { reply, isFallback: true };
    }

    // C. 挑壶 / 配壶 / 茶器匹配
    if (
      qLower.includes('壶') ||
      qLower.includes('配') ||
      qLower.includes('盖碗') ||
      qLower.includes('泥料') ||
      qLower.includes('器皿')
    ) {
      reply = `🫖 **【器为茶之父 · 器茶配伍法门】**\n\n`;
      if (wares.length > 0) {
        reply += `您目前藏有 **${wares.length}** 件茶器，为您梳理私房器具的最佳适配茶品：\n\n`;
        wares.slice(0, 4).forEach((w) => {
          let advice = '全发酵茶或陈年老茶';
          const mat = w.material || '';
          if (mat.includes('朱泥') || mat.includes('红泥')) {
            advice = '高香乌龙茶（铁观音、凤凰单丛、武夷岩茶），朱泥结晶度高、聚香扬香';
          } else if (mat.includes('段泥') || mat.includes('本山绿')) {
            advice = '绿茶、白茶、清香铁观音，色泽透润不养花泥料';
          } else if (mat.includes('紫泥') || mat.includes('底槽清') || mat.includes('清水泥')) {
            advice = '熟普、生普、陈年黑茶，泥门疏密得中，吸附杂气、凸显醇滑';
          } else if (w.category.includes('盖碗') || mat.includes('瓷')) {
            advice = '试茶利器，不夺香、不借味，适合审评所有茶品';
          }
          reply += `• **【${w.name}】**（${w.material || w.category}，${w.capacity_ml ? w.capacity_ml + 'ml' : '标准'}）\n  👉 最宜冲泡：${advice}\n`;
        });
      } else {
        reply += `• **朱泥壶**：胎质致密、气孔细小，最宜侍奉高香乌龙茶与生普，逼香凌厉；\n• **紫泥/底槽清**：双重气孔透气醇厚，宜侍奉普洱、安化黑茶与红茶；\n• **段泥壶**：宜泡淡色高雅茶品，防茶汤重色挂壁；\n• **白瓷盖碗**：忠实还原真香真味，为品鉴新茶的首选标准器。`;
      }
      return { reply, isFallback: true };
    }

    // D. 冲泡方法 / 温度 / 水温 / 投茶
    if (
      qLower.includes('冲泡') ||
      qLower.includes('水温') ||
      qLower.includes('投茶') ||
      qLower.includes('手法') ||
      qLower.includes('怎么泡')
    ) {
      const currentTea = matchedTeas[0] || teas[0];
      const teaName = currentTea ? `【${currentTea.name}】` : '此款茶品';
      const cat = currentTea?.category || '茗茶';

      let temp = 95;
      let ratio = '1:20 (约 7g 投茶 / 130ml 盖碗)';
      let steep = '前三泡 5~8秒，中段 12~15秒，尾段 20秒以上';

      if (cat.includes('绿茶')) {
        temp = 85;
        ratio = '1:50 (约 3g 茶 / 150ml 玻璃杯或盖碗)';
        steep = '下投法或中投法，不盖盖闷，浸润 45秒后饮用';
      } else if (cat.includes('岩茶') || cat.includes('普洱') || cat.includes('黑茶')) {
        temp = 100;
        ratio = '1:18~1:20 (约 7.5~8g / 130ml 盖碗或紫砂壶)';
        steep = '首泡沸水润茶 5秒倒出叶底醒香，正式冲泡 8~10秒出汤';
      }

      reply = `💧 **【侍茶冲泡指南 · ${teaName}】**\n\n`;
      reply += `1. **温度掌控**：建议水温 **${temp}℃**（${temp >= 98 ? '纯正鼎沸滚水，高温方能破开紧结条索与内质' : '水沸后略微静置，防高温烫伤幼嫩茶芽'}）；\n`;
      reply += `2. **茶水配比**：**${ratio}**；\n`;
      reply += `3. **出汤节拍**：${steep}；\n`;
      reply += `4. **注水手法**：沿盖碗内壁定点轻注，避免水流直击中心茶胆，保持茶汤明净清澈。`;
      return { reply, isFallback: true };
    }

    // E. 默认综合分析：关联用户实际存茶盘点与今日侍茶推荐
    reply = `🍃 **【私房侍茶师 · 茶席推介】**\n\n`;
    if (teas.length > 0) {
      const featured = teas[Math.floor(Math.random() * teas.length)];
      reply += `您当前藏库共有 **${teas.length}** 款珍品茶叶与 **${wares.length}** 件雅器。\n\n`;
      reply += `今日为您点席推荐：\n• **【${featured.name}】**（${featured.category || '茶品'}，存量: ${featured.quantity}${featured.unit}）\n`;
      if (featured.origin) reply += `  - 产地风土：${featured.origin}\n`;
      if (featured.year) reply += `  - 岁月陈韵：${featured.year}年\n`;
      if (featured.description) reply += `  - 藏品品评：${featured.description}\n`;

      if (wares.length > 0) {
        const matchingWare = wares[0];
        reply += `• **推荐配席器皿**：【${matchingWare.name}】（${matchingWare.material || matchingWare.category}）\n`;
      }
      reply += `\n💬 您可随时向我询问具体的“冲泡手法”、“晚间选茶”、“配壶建议”或直接报茶名调取侍茶方案。`;
    } else {
      reply += `欢迎步入茶室！您可以在系统中录入您的茶叶与紫砂器物，我将依据您的实际库存，为您提供量身定制的选茶搭配、水温节拍与品茗指导。`;
    }

    return { reply, isFallback: true };
  }

  // 感官风味与雷达推导 (Sensory Profiling Fallback)
  if (action === 'sensory') {
    const teaInfo = payload.teaInfo || {};
    const text = payload.text || '';
    const name = teaInfo.name || '精选茗茶';
    const cat = teaInfo.category || '';
    const yearNum = teaInfo.year ? parseInt(teaInfo.year) : 2023;
    const isAged = yearNum < 2018;

    let aroma = 4;
    let aftertaste = 4;
    let salivation = 4;
    let endurance = 4;
    let body = 4;
    let sensation = 3;
    let temp = 95;
    let grams = 7.5;
    let seconds = 12;
    let ware = '120ml 白瓷盖碗';
    let tags = ['兰香清幽', '生津回甘', '汤感温润'];

    if (cat.includes('生普')) {
      aroma = isAged ? 4 : 5;
      aftertaste = 5;
      salivation = 5;
      endurance = 5;
      body = 4;
      sensation = 5;
      temp = 98;
      grams = 8;
      seconds = 8;
      ware = isAged ? '原矿紫泥紫砂壶 (160ml)' : '110ml 白瓷盖碗';
      tags = isAged ? ['陈韵梅香', '舌底鸣泉', '气感通达'] : ['清香花蜜', '回甘迅猛', '山野气韵'];
    } else if (cat.includes('熟普') || cat.includes('黑茶')) {
      aroma = 3;
      aftertaste = 4;
      salivation = 3;
      endurance = 5;
      body = 5;
      sensation = 4;
      temp = 100;
      grams = 8;
      seconds = 10;
      ware = '原矿紫泥或段泥紫砂壶 (180ml)';
      tags = ['陈香沉稳', '糯滑醇厚', '温润通透'];
    } else if (cat.includes('岩茶') || cat.includes('乌龙') || cat.includes('单丛')) {
      aroma = 5;
      aftertaste = 5;
      salivation = 4;
      endurance = 4;
      body = 4;
      sensation = 4;
      temp = 100;
      grams = 8;
      seconds = 10;
      ware = '原矿朱泥西施壶或白瓷盖碗';
      tags = ['岩骨花香', '回味悠长', '丛香馥郁'];
    } else if (cat.includes('白茶')) {
      aroma = 4;
      aftertaste = 4;
      salivation = 4;
      endurance = isAged ? 5 : 4;
      body = isAged ? 5 : 3;
      sensation = 4;
      temp = isAged ? 98 : 90;
      grams = 6.5;
      seconds = 15;
      ware = isAged ? '老段泥壶或煮茶提梁壶' : '110ml 白瓷盖碗';
      tags = isAged ? ['药香枣甜', '稠滑温润', '耐煮耐泡'] : ['毫香清鲜', '甘甜如泉', '清心悦神'];
    } else if (cat.includes('绿茶')) {
      aroma = 5;
      aftertaste = 4;
      salivation = 4;
      endurance = 3;
      body = 3;
      sensation = 3;
      temp = 85;
      grams = 3.5;
      seconds = 40;
      ware = '极简高硼硅玻璃杯或薄胎白瓷盖碗';
      tags = ['鲜爽清甘', '嫩香豆甜', '杯底清芬'];
    }

    const note = `【${name}】干茶条索舒展匀齐，干嗅香气醇正无杂。温杯投茶后香韵被热力瞬间激发；头汤明净澄澈，入口水路细腻，${tags[0]}；中段回甘生津连绵，${tags[1]}；尾水甘甜如泉，体感通畅，堪称茶席妙品。`;

    return {
      success: true,
      data: {
        flavor_profile: { aroma, aftertaste, salivation, endurance, body, sensation },
        brewing_guide: {
          water_temp: temp,
          tea_grams: grams,
          steep_seconds: seconds,
          recommended_ware: ware
        },
        polished_note: text ? `${text}\n\n【侍茶师润色】：${note}` : note,
        suggested_tags: tags
      },
      isFallback: true
    };
  }

  // 图片视觉提取 (Vision Fallback)
  if (action === 'vision') {
    const isWare = payload.typeHint === 'TEAWARE';
    return {
      success: true,
      data: {
        type: isWare ? 'TEAWARE' : 'TEA',
        name: isWare ? '紫砂仿古壶' : '易武正山古树生茶',
        category: isWare ? '紫砂壶' : '生普',
        year: '2021',
        origin: isWare ? '江苏宜兴' : '云南西双版纳',
        material: isWare ? '原矿底槽清' : undefined,
        capacity_ml: isWare ? 180 : undefined,
        paired_tea: isWare ? '宜冲生普、熟普、武夷岩茶' : undefined,
        description: isWare
          ? '壶身骨肉停匀，线条遒劲流转。底款规整，出水爽利，具文人雅器之神韵。'
          : '精选高山大树原料，条索紧实墨润，白毫显露。开汤花蜜香高扬，山野气韵充沛。',
        tags: isWare ? ['名家工料', '器型稳健', '双气孔透气'] : ['高山古树', '生津回甘', '宜藏宜品']
      },
      isFallback: true
    };
  }

  return { error: 'Unknown action' };
}

/**
 * 远程 OpenAI 兼容接口请求转发器 (支持 DeepSeek, 硅基流动, Qwen 等)
 */
async function callOpenAiCompatible(aiConfig, messages, systemPrompt) {
  const baseUrl = (aiConfig.customBaseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const apiKey = aiConfig.customApiKey;
  const model = aiConfig.customModel || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('未提供自定义接口 API Key');
  }

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }))
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI 兼容接口响应异常 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '侍茶师沉吟良久，未能成语。';
  return reply;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    action,
    messages,
    collectionSummary,
    text,
    teaInfo,
    image,
    typeHint,
    aiConfig
  } = req.body || {};

  const currentAction = action || req.query.action || 'chat';
  const provider = aiConfig?.provider || 'builtin';

  // 1. 若选择或降级为内置茶学专家引擎 (免 Key 零成本)
  if (provider === 'builtin') {
    const fallbackResult = runBuiltinExpertEngine(currentAction, req.body || {});
    return res.status(200).json({
      ...fallbackResult,
      usedModel: 'builtin',
      modelDisplayName: '内置茶学专家'
    });
  }

  // 2. 若选择 OpenAI 兼容接口 (DeepSeek / 硅基流动 / Qwen)
  if (provider === 'openai_compatible') {
    try {
      const collectionTeasStr = (collectionSummary?.teas || [])
        .map(
          (t) =>
            `- 【${t.name}】(${t.category || '茶品'}, ${t.year ? t.year + '年' : ''}, 产地:${t.origin || '未知'}, 库存:${t.quantity || 0}${t.unit || ''})`
        )
        .slice(0, 30)
        .join('\n');

      const collectionWaresStr = (collectionSummary?.wares || [])
        .map(
          (w) =>
            `- 【${w.name}】(${w.category || '茶器'}, 材质:${w.material || '未知'}, 容量:${w.capacity_ml ? w.capacity_ml + 'ml' : '未注'})`
        )
        .slice(0, 20)
        .join('\n');

      const systemPrompt = `你是一位学识博雅、精通中国茶道与紫砂器物美学的“茶席侍茶师”，服务于私房茶室“茶韵典藏”。
用户当前私房藏茶库：
${collectionTeasStr || '（暂无已录入茶叶）'}
用户当前私房茶器库：
${collectionWaresStr || '（暂无已录入茶器）'}
请结合用户真实库存，给出高水准、温润典雅的选茶、配器与冲泡指导。`;

      if (currentAction === 'chat') {
        const reply = await callOpenAiCompatible(aiConfig, messages || [], systemPrompt);
        const usedModel = aiConfig?.customModel || 'openai_compatible';
        return res.status(200).json({
          reply,
          usedModel,
          modelDisplayName: usedModel,
          isFallback: false
        });
      }

      // 若为 sensory 或 vision，在未做结构化解析时优雅回退至专家推导引擎
      const fallbackResult = runBuiltinExpertEngine(currentAction, req.body || {});
      return res.status(200).json({
        ...fallbackResult,
        usedModel: 'builtin',
        modelDisplayName: '内置茶学专家 (离线知识库)'
      });
    } catch (err) {
      console.warn('OpenAI compatible call error, fallback to builtin:', err);
      const fallback = runBuiltinExpertEngine(currentAction, req.body || {});
      return res.status(200).json({
        ...fallback,
        usedModel: 'builtin',
        modelDisplayName: '内置茶学专家 (降级运行)',
        warning: `自定义模型调用失败 (${err.message})，已切换至内置茶学专家。`
      });
    }
  }

  // 3. 若选择 Google Gemini 官方大模型
  const geminiKey = aiConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim() === '' || geminiKey.includes('your-gemini-api-key')) {
    // 无 Key 时自动无缝启用内置茶学大师引擎
    const fallbackResult = runBuiltinExpertEngine(currentAction, req.body || {});
    return res.status(200).json({
      ...fallbackResult,
      usedModel: 'builtin',
      modelDisplayName: '内置茶学专家 (未配置 Gemini Key)',
      warning: '尚未配置 Gemini API Key，已自动由内置茶学专家为您服务。'
    });
  }

  // 现代有效模型候选列表 (按稳定性与响应速度排序，避免 503 拥堵)
  const CANDIDATE_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  async function callGeminiWithFallback(ai, preferredModel, params) {
    const modelsToTry = [];
    // 严格优先采用用户指定的模型
    if (preferredModel) {
      // 若包含已废弃的旧版本别名则转换为最新版本
      const normalized = preferredModel === 'gemini-2.5-flash' ? 'gemini-3.8-flash' : preferredModel;
      modelsToTry.push(normalized);
    }
    for (const m of CANDIDATE_GEMINI_MODELS) {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    }

    let lastError = null;
    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: m
        });
        return { response, usedModel: m };
      } catch (err) {
        lastError = err;
        // 当模型遇到临时 503 繁忙或 429 限流时，微延时后平滑切换至下一备用候选模型
        if (err.status === 503 || err.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }
    throw lastError;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
    const preferredModel = aiConfig?.geminiModel || 'gemini-3.8-flash';

    if (currentAction === 'chat') {
      const collectionTeasStr = (collectionSummary?.teas || [])
        .map(
          (t) =>
            `- 【${t.name}】(${t.category || '茶品'}, ${t.year ? t.year + '年' : ''}, 产地:${t.origin || '未知'}, 库存:${t.quantity || 0}${t.unit || ''}${t.description ? ', 描述:' + t.description : ''})`
        )
        .slice(0, 50)
        .join('\n');

      const collectionWaresStr = (collectionSummary?.wares || [])
        .map(
          (w) =>
            `- 【${w.name}】(${w.category || '茶器'}, 材质:${w.material || '未知'}, 容量:${w.capacity_ml ? w.capacity_ml + 'ml' : '未注'}, 适茶:${w.paired_tea || '通用'})`
        )
        .slice(0, 30)
        .join('\n');

      const systemPrompt = `你是一位学识博雅、精通中国茶道与器物美学的“茶席侍茶师”（Tea Sommelier & Ware Curator），服务于高端私房茶室应用“茶韵典藏”。
你的语言风格应当温润典雅、富有东方文人雅趣，同时专业、清晰且极具可操作性。

【用户当前私房藏茶库（真实数据）】：
${collectionTeasStr || '（暂无已录入茶叶）'}

【用户当前私房茶器库（真实数据）】：
${collectionWaresStr || '（暂无已录入茶器）'}

【核心指导原则】：
1. 当用户询问“今天喝什么茶”、“如何配壶”、“有哪些老茶”等问题时，请优先从上方用户的【真实藏茶库】与【真实茶器库】中挑选并精准推荐！指出品名并阐述搭配的泥料、容量理由。
2. 给出详细的冲泡指导建议：投茶克数（如 7-8g）、水温（如 95-100℃ 沸水润茶后出汤）、出汤节拍（秒数）、水流注水手法（定点细流或高冲悬壶）。
3. 探讨茶道文化、时令节气、年份陈化趋势及养壶包浆心法。
4. 回答条理分明，善用精炼排版。禁止说教腔调，自然真诚如茶友对谈。`;

      const contents = (messages || []).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: '你好，侍茶师！' }] });
      }

      const { response, usedModel } = await callGeminiWithFallback(ai, preferredModel, {
        contents,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const reply = response.text || '茶香袅袅，请您重试提问。';
      return res.status(200).json({ reply, usedModel, isFallback: false });
    }

    if (currentAction === 'sensory') {
      const sensoryPrompt = `作为中国茶感官审评专家，请分析以下茶友的品饮心得或感官描述，并结合茶叶基本信息推导其六维风味雷达评分及标准冲泡方案。

茶叶信息：
- 品名: ${teaInfo?.name || '未知茶品'}
- 类目: ${teaInfo?.category || '未知'}
- 年份: ${teaInfo?.year || '未知'}
- 产地: ${teaInfo?.origin || '未知'}

茶友品饮感受/描述：
"${text || ''}"

请输出严格的 JSON 格式（不要添加额外包裹文本），包含以下字段：
1. "flavor_profile": 对象，包含六个 1 到 5 的整数评分：
   - "aroma": 香气馥郁度 (1-5)
   - "aftertaste": 回甘持久度 (1-5)
   - "salivation": 生津鸣泉度 (1-5)
   - "endurance": 耐泡程度 (1-5)
   - "body": 汤感厚重度 (1-5)
   - "sensation": 茶气体感与喉韵 (1-5)
2. "brewing_guide": 对象，冲泡建议：
   - "water_temp": 冲泡水温 (摄氏度数字, 如 95 或 100)
   - "tea_grams": 建议投茶克数 (如 7 或 8)
   - "steep_seconds": 第一泡出汤秒数 (如 10 或 15)
   - "recommended_ware": 推荐使用的器皿 (如 "原矿朱泥紫砂壶" 或 "110ml白瓷盖碗")
3. "polished_note": 一段优美雅致、专业传神的文人品鉴茶评（80~150字，文学性与审评严谨度兼具）。
4. "suggested_tags": 3~5个精炼的风味标签数组（如 ["兰香幽微", "两颊生津", "岩骨清奇"]）。`;

      const { response } = await callGeminiWithFallback(ai, preferredModel, {
        contents: sensoryPrompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawJson = response.text || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(rawJson);
      } catch (e) {
        console.error('Failed to parse sensory JSON:', e, rawJson);
      }

      return res.status(200).json({
        success: true,
        data: parsed,
        isFallback: false
      });
    }

    if (currentAction === 'vision') {
      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }

      let base64Data = image;
      let mimeType = 'image/jpeg';
      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const visionPrompt = `请仔细观察并识别分析这张中国茶或茶器相关照片（可能是茶饼外包装棉纸、茶叶内飞/条索、茶盒、紫砂壶、底款印章、窑变建盏、工艺证书等）。
类型倾向参考：${typeHint || 'AUTO'}
请输出严格的 JSON 格式（不要添加额外包裹文本），包含以下字段：
1. "type": "TEA" 或 "TEAWARE"
2. "name": 提取或推荐的名称
3. "category": 品类
4. "year": 生产年份（纯年份字符串如 "2019" 或 ""）
5. "origin": 产地
6. "material": 泥料/材质（茶器）
7. "capacity_ml": 预估容量数字（茶器）
8. "paired_tea": 适茶建议（茶器）
9. "description": 50~100字的雅致藏品描述与品相鉴定观察
10. "tags": 2~4个特征标签数组`;

      const { response } = await callGeminiWithFallback(ai, preferredModel, {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              { text: visionPrompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const rawJson = response.text || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(rawJson);
      } catch (e) {
        console.error('Failed to parse vision JSON:', e, rawJson);
      }

      return res.status(200).json({
        success: true,
        data: parsed,
        isFallback: false
      });
    }

    return res.status(400).json({ error: `Unsupported action: ${currentAction}` });
  } catch (err) {
    console.error('Gemini AI API Execution Error:', err);
    const fallback = runBuiltinExpertEngine(currentAction, req.body || {});
    return res.status(200).json({
      ...fallback,
      usedModel: 'builtin',
      modelDisplayName: '内置茶学专家 (降级运行)',
      warning: `Gemini API 调用异常 (${err.message || 'Error'})，已自动切换至内置专业茶学引擎。`
    });
  }
}
