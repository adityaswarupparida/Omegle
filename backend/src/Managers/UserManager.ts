import { Socket } from "socket.io";
import { Room, RoomManager } from "./RoomManager";

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
        socket.emit("lobby");
        this.matchUser();
        this.initHandlers(socket);
    }
    removeUser(room: string, socketId: string) {
        this.roomManager.onClose(room, socketId);
        //@ts-ignore
        const { user1, user2 }: Room = this.roomManager.getUsers(room);
        this.users = this.users.filter(user => user !== user1 && user !== user2);
        this.queue = this.queue.filter(skt => skt !== user1.socket.id && skt !== user2.socket.id);
    }
    matchUser() {
        if (this.queue.length < 2) {
            return;
        }
        // take user1 from beginning and user2 from end
        const skt1 = this.queue.shift();
        const skt2 = this.queue.pop();

        const user1 = this.users.find(user => user.socket.id === skt1);
        const user2 = this.users.find(user => user.socket.id === skt2);

        if (!user1 || !user2) {
            return;
        }
        const room = this.roomManager.createRoom(user1, user2);
        user1.socket.emit("room", {
            roomId: room
        })
        user2.socket.emit("room", {
            roomId: room
        })
    }
    initHandlers(socket: Socket) {
        socket.on("offer", ({ SDP, roomId }: { SDP: string, roomId: string }) => {
            this.roomManager.onOffer(roomId, SDP, socket.id);
        })
        socket.on("answer", ({ SDP, roomId }: { SDP: string, roomId: string }) => {
            this.roomManager.onAnswer(roomId, SDP, socket.id);
        })
        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        })
    }
    
}