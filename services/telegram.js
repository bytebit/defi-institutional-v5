import axios from "axios";

export async function sendAlert(text) {

  if (!process.env.TG_BOT_TOKEN)
    return;

  await axios.post(
    `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
    {
      chat_id: process.env.TG_CHAT_ID,
      text
    }
  );
}
