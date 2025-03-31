import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
    socket: Socket;
    name : string;
}

export class UserManager {
    private users: User[];
    private queue: string[];
    private roomManager: RoomManager;
    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
    }
    addUser(name: string, socket: Socket) {
        this.users.push({
            name: name,
            socket: socket
        })
        this.queue.push(socket.id);
        console.log('1. Inside adduser');
        socket.emit("lobby");
        this.matchUser();
        this.initHandlers(socket);
    }
    removeUser(socketId: string) {
        this.users = this.users.filter(user => user.socket.id !== socketId);
        this.queue = this.queue.filter(skt => skt == socketId);
    }
    matchUser() {
        console.log('2. Inside matchuser');

        if (this.queue.length < 2) {
            return;
        }
        const skt1 = this.queue.shift();
        const skt2 = this.queue.pop();

        const user1 = this.users.find(user => user.socket.id === skt1);
        const user2 = this.users.find(user => user.socket.id === skt2);

        if (!user1 || !user2) {
            return;
        }
        console.log('3. Inside matchuser');

        const room = this.roomManager.createRoom(user1, user2);
    }
    initHandlers(socket: Socket) {
        console.log('5. Inside inithandlers');

        socket.on("offer", ({ SDP, roomId }: { SDP: string, roomId: string }) => {
            console.log('UM Inside offer logic');

            this.roomManager.onOffer(roomId, SDP, socket.id);
        })
        socket.on("answer", ({ SDP, roomId }: { SDP: string, roomId: string }) => {
            console.log('UM Inside answer logic');

            this.roomManager.onAnswer(roomId, SDP, socket.id);
        })
        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            console.log('UM Inside on-ice-candidate logic for '+type);

            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        })
        console.log(socket.id+ ' '+socket.eventNames());
    }
    
}