const axios = require('axios');

async function getAIReply(userMessage, history, context) {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001",
        messages: [
            { role: "system", content: `Bạn là trợ lý shop Hương Kid. Kho: ${context}` },
            ...history,
            { role: "user", content: userMessage }
        ]
    }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } });

    return response.data.choices[0].message.content;
}

module.exports = { getAIReply };
