const { CohereClientV2 } = require('cohere-ai');

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY,
});

// Diccionario en memoria para guardar el historial de cada dispositivo
const historiales = {};

async function chatWithCohere(message, clientId, reset = false) {
  // 1. Si enviamos la orden de reset o el array del id no existe, empezamos de cero o limpiamos la memoria
  if (reset || !historiales[clientId]) {
    historiales[clientId] = [];
  }

  // 2. Añadimos el mensaje del usuario al historial de ese cliente
  historiales[clientId].push({
    role: 'user',
    content: message,
  });

  try {
    // 3. Hacemos la consulta pasándole todo el historial del cliente
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: historiales[clientId],
    });

    const botReply = response.message.content[0].text;

    // 4. Guardamos la respuesta de la IA en el historial para mantener el contexto
    historiales[clientId].push({
      role: 'assistant',
      content: botReply,
    });

    return botReply;

  } catch (error) {
    console.error('Error con Cohere:', error.message);
    return "Error en el servidor de IA";
  }
}

module.exports = chatWithCohere;

