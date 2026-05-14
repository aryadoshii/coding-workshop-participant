const GROQ_API_KEY =
  import.meta.env.VITE_GROQ_API_KEY

export async function generateEmployeeInsight(data) {

  try {

    const prompt = `
You are an HR analytics AI assistant.

Analyze this employee workforce data.

Return:
- performance summary
- strengths
- weaknesses
- promotion readiness
- learning progress

Keep it concise and professional.

Employee Data:
${JSON.stringify(data, null, 2)}
`

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization:
            `Bearer ${GROQ_API_KEY}`
        },

        body: JSON.stringify({

          model: 'llama3-70b-8192',

          messages: [
            {
              role: 'system',
              content:
                'You are an HR workforce analytics assistant.'
            },

            {
              role: 'user',
              content: prompt
            }
          ],

          temperature: 0.5,

          max_tokens: 180

        })
      }
    )

    const result =
      await response.json()

    return (
      result?.choices?.[0]
        ?.message?.content
      ||
      'AI insights unavailable.'
    )

  } catch (err) {

    console.error(err)

    return 'Unable to generate AI insights.'

  }

}