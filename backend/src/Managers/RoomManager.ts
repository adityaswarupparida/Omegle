import { User } from "./UserManager";

let GLOBAL_ROOM_NO = 1;

interface Room {
    user1: User;
    user2: User;
}
export class RoomManager {
    private rooms: Map<string, Room>;
    constructor() {
        this.rooms = new Map<string, Room>();
    }
    generate() {
        return GLOBAL_ROOM_NO++;
    }
    createRoom(user1: User, user2: User) {
        const roomId = this.generate().toString();
        this.rooms.set(roomId.toString(), {
            user1,
            user2,
        });

        console.log('4. Inside createroom');

        user1.socket.emit("send-offer", {
            roomId: roomId
        })

        user2.socket.emit("send-offer", {
            roomId: roomId
        })
    }
    onOffer(roomId: string, SDP: string, socketId: string) {
        console.log('6. Inside onOffer');

        const room = this.rooms.get(roomId);
        if(!room) return;

        const receivingUser = room.user1.socket.id === socketId ? room.user2: room.user1;
        console.log('Inside onOffer logic '+receivingUser.socket.id+ ' from: '+socketId);

        receivingUser.socket.emit("offer", {
            SDP,
            roomId
        })
    }
    onAnswer(roomId: string, SDP: string, socketId: string) {
        console.log('7. Inside onAnswer');

        const room = this.rooms.get(roomId);
        if(!room) return;

        const receivingUser = room.user1.socket.id === socketId ? room.user2: room.user1;
        console.log('Inside onANswer logic '+receivingUser.socket.id+ ' from: '+socketId);

        receivingUser.socket.emit("answer", {
            SDP,
            roomId
        })
    }

    onIceCandidates(roomId: string, socketId: string, candidate: any, type: "sender"|"receiver") {
        console.log('8. Inside onIceCandidates');

        const room = this.rooms.get(roomId);
        if(!room) return;

        const receivingUser = room.user1.socket.id === socketId ? room.user2: room.user1;
        console.log('Inside onIceCandidates logic for '+receivingUser.socket.id+ ' from: '+socketId);
        receivingUser.socket.emit("add-ice-candidate", {
            candidate,
            type
        })
    }
}