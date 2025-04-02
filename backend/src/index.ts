import { Server, Socket } from "socket.io";
import http from "http";
import { UserManager } from "./Managers/UserManager";

const server = http.createServer(http);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
let count = 1;
const userManager = new UserManager();

io.on("connection", (socket: Socket) => {
    console.log('Connection established!!! '+count++);
    socket.on("join", function (data: { name : string }) {
        // socket.join(data.email); // We are using room of socket io
        userManager.addUser(data.name, socket);

    });
    socket.on("close", ({ room }) => {
        userManager.removeUser(room, socket.id);
    })
})

server.listen(3000, () => {
    console.log(`Listening at port ${3000}`);
})