import { createApp } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

const app = createApp();
app.listen(PORT, () => {
  console.log(`sqftex backend listening on :${PORT}`);
});
