import { config } from "dotenv";
config({ path: './config/config.env' });


export async function getAIRecommendation(req, res, userPrompt, products) {
    const API_KEY = process.env.GEMINI_API_KEY;
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + API_KEY;

    try {
        const geminiPrompt = `
                    Here is a list of available products:
                    ${JSON.stringify(products, null, 2)}
                    Based on the following user request, filter and suggest the best matching products:
                    "${userPrompt}"
                    Only return the matching products in the JSON format.
                    `;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: geminiPrompt }] }],
            }),
        });

        const data = await response.json();
        console.log(data);
        const aiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const cleanedText = aiResponseText.replace(/```json\s*|\s*```/g, '').trim();
        if (!cleanedText) {
            return res.status(200).json({
                success: false,
                message: "AI response is empty or invalid",
            });
        }
        let parsedProducts;
        try {
            parsedProducts = JSON.parse(cleanedText);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to parse AI response",
            });
        }
        return { success: true, products: parsedProducts };
    } catch (error) {
        console.error("❌ Failed To Get AI Recommendation.", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get AI recommendation",
        });
    }

}
