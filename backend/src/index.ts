import { Server, Socket } from "socket.io";
import http from "http";

const server = http.createServer(http);
const io = new Server(server);

io.on("connection", (socket: Socket) => {
    console.log('Connection established!!');
})

server.listen(3000, () => {
    console.log(`Listening at port ${3000}`);
})