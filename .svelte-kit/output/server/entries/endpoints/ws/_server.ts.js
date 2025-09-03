import "ws";
async function GET() {
  return new Response("WebSocket endpoint - connect via WS protocol", {
    status: 200,
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
export {
  GET
};
