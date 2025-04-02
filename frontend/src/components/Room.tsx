import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';

const URL = "ws://localhost:3000";

export const Room = ({
    name,
    localVideoTrack,
    localAudioTrack
}: {
    name: string;
    localVideoTrack: MediaStreamTrack;
    localAudioTrack: MediaStreamTrack;
}) => {

    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<Socket>();
    const [room, setRoom] = useState<String>();
    const [localConnection, setLocalConnection] = useState<RTCPeerConnection>();
    const [remoteConnection, setRemoteConnection] = useState<RTCPeerConnection>();
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream>();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket: Socket = io(URL);
        socket.emit('join', {
            name: name
        });

        socket.on("send-offer", async ({ roomId }) => {
            const lc = new RTCPeerConnection();
            setLocalConnection(lc);

            // if(!localAudioTrack || !localVideoTrack) return;
            if(localVideoTrack) 
                lc.addTrack(localVideoTrack);
            if(localAudioTrack)
                lc.addTrack(localAudioTrack);

            lc.onicecandidate = (e) => {
                if(e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    })
                }
            }

            lc.onnegotiationneeded = async () => {
                const SDP = (await lc.createOffer()).sdp;
                await lc.setLocalDescription({ sdp: SDP, type: "offer" });
                socket.emit("offer", {
                    roomId: roomId,
                    SDP: SDP
                })
            }
        });

        socket.on("offer", async ({ roomId, SDP }) => {
            setLobby(false);
            const rc = new RTCPeerConnection();
            const stream = new MediaStream();
            
            // if(!remoteVideoRef.current) return;
            if(remoteVideoRef.current)
                remoteVideoRef.current.srcObject = stream;
            rc.ontrack = async (e) => {
                // @ts-ignore
                remoteVideoRef.current.srcObject.addTrack(e.track);
                if(remoteVideoRef.current && remoteVideoRef.current.paused){
                    await remoteVideoRef.current.play();
                }
            }
            // to ensure icecandidates from local find remote connection
            setRemoteConnection(rc);

            await rc.setRemoteDescription({ sdp: SDP, type: "offer" });
            const sdp = (await rc.createAnswer()).sdp;
            await rc.setLocalDescription({ sdp: sdp, type: "answer" });

            // if(remoteVideoRef.current)
            //     remoteVideoRef.current.srcObject = stream;
            setRemoteMediaStream(stream);
            setRemoteConnection(rc);

            // window.pcr = rc;

            rc.onicecandidate = (e) => {
                if(e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "receiver",
                        roomId
                    })
                }
            }

            socket.emit("answer", {
                SDP: sdp,
                roomId: roomId
            })
        });

        socket.on("answer", async ({ roomId, SDP }) => {
            setLocalConnection(lc => {
                lc?.setRemoteDescription({
                    sdp: SDP,
                    type: "answer"
                })
                return lc;
            })
            setLobby(false);
        });

        socket.on("lobby", () => {
            setLobby(true);
        })
        socket.on("room", ({ roomId }) => {
            setRoom(roomId);
        })

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            if (type == "sender") {
                setRemoteConnection(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setLocalConnection(pc => {
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        }) 

        socket.on("close", () => {
            window.location.reload();
            socket.close();
        })

        setSocket(socket);

        return () => {
            localConnection?.close();
            remoteConnection?.close();
        }
    }, []);

    useEffect(() => {
        (async() => {
        if (localVideoRef && localVideoRef.current) {
            if (!localVideoTrack) return;            
            // if(localVideoTrack)
            localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            await localVideoRef.current.play();
        }})();
    }, [localVideoRef]);

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between w-screen">
                <div className='w-full relative'>
                    <video autoPlay className='w-full relative' ref={localVideoRef}></video>
                    <div className='absolute z-10 text-white text-lg bottom-2 right-2'>
                            You ({name})
                    </div>
                </div>
                <div className='w-full relative'>
                    { lobby ? 'Waiting to connect you with someone...': null }
                    <video className='w-full relative' ref={remoteVideoRef}></video>
                </div>
            </div>
            <div className='flex justify-center items-center'>
                <button className='bg-red-500/90 hover:bg-red-600 text-xl px-9 py-3 m-4 rounded-full cursor-pointer'
                    onClick={() => {
                        window.location.reload();
                        socket?.emit("close", {
                            room
                        });
                        socket?.close();
                    }}
                >
                    Leave call
                </button>
            </div>
        </div>
    );
}