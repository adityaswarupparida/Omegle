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

        user1.socket.emit("send-offer", {
            roomId: roomId
        })

        user2.socket.emit("send-offer", {
            roomId: roomId
        })
    }
    onOffer(roomId: string, SDP: string) {
        const user2 = this.rooms.get(roomId)?.user2;
        user2?.socket.emit("offer", {
            SDP,
            roomId
        })
    }
    onAnswer(roomId: string, SDP: string) {
        const user1 = this.rooms.get(roomId)?.user1;
        user1?.socket.emit("answer", {
            SDP,
            roomId
        })
    }
}