import { io, Socket } from 'socket.io-client';
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from 'react';

const URL = "ws://localhost:3000";

export const Room = () => {
    const [searchParams, setSearchParams] = useSearchParams(); 
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<Socket>();
    const name = searchParams.get("name");
    const [sendPC, setSendPC] = useState<RTCPeerConnection>();
    const [receivePC, setReceivePC] = useState<RTCPeerConnection>();
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack>();
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack>();
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack>();
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack>();

    useEffect(() => {
        const socket: Socket = io(URL);
        // socket.emit('join', {
        //     name: name
        // });

        socket.on("send-offer", async ({ roomId }) => {
            console.log("Send offer please");
            const lc = new RTCPeerConnection();
            setSendPC(lc);

            const SDP = (await lc.createOffer()).sdp;

            socket.emit("offer", {
                SDP: SDP,
                roomId: roomId
            })
        });

        socket.on("offer", async ({ roomId, SDP }) => {
            console.log("Send answer please");
            setLobby(false);
            const rc = new RTCPeerConnection();
            await rc.setRemoteDescription({ sdp: SDP, type: "offer" });
            const sdp = (await rc.createAnswer()).sdp;
            setReceivePC(rc);

            rc.ontrack = ({ track, type }) => {
                if(type == "audio") {
                    setRemoteAudioTrack(track);
                } else {
                    setRemoteVideoTrack(track);
                }
            }

            socket.emit("answer", {
                SDP: sdp,
                roomId: roomId
            })
        });

        socket.on("answer", ({ roomId, SDP }) => {
            setLobby(false);
            setSendPC(lc => {
                lc?.setRemoteDescription({
                    sdp: SDP,
                    type: "answer"
                })
                return lc;
            })
            console.log("Connection done");
        });

        socket.on("lobby", () => {
            setLobby(true);
        })

        setSocket(socket);
    }, [name]);

    if (lobby) {
        return <div>
            Waiting to connect you with someone...
        </div>
    }
    return (
        <div>
            Hi {name}, Room Page
            <video width={400} height={400}></video>
            <video width={400} height={400}></video>
        </div>
    );
}