import { io, Socket } from 'socket.io-client';
// import { useSearchParams } from "react-router-dom";
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
    // const [searchParams, setSearchParams] = useSearchParams(); 
    // const name = searchParams.get("name");
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<Socket>();
    const [room, setRoom] = useState<String>();
    const [sendPC, setSendPC] = useState<RTCPeerConnection>();
    const [receivePC, setReceivePC] = useState<RTCPeerConnection>();
    // const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack>();
    // const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack>();
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream>();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket: Socket = io(URL);
        socket.emit('join', {
            name: name
        });

        socket.on("send-offer", async ({ roomId }) => {
            console.log("5. Send offer please");
            const lc = new RTCPeerConnection();
            setSendPC(lc);

            // if(!localAudioTrack || !localVideoTrack) return;
            if(localVideoTrack) 
                lc.addTrack(localVideoTrack);
            if(localAudioTrack)
                lc.addTrack(localAudioTrack);
            console.log(localVideoTrack);
            console.log(localAudioTrack);
            // console.log('lc '+lc);

            lc.onicecandidate = async (e) => {
                if(e.candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate: e.candidate,
                        type: "sender",
                        roomId
                    })
                }
            }

            lc.onnegotiationneeded = async () => {
                console.log("6. Send offer sent");

                const SDP = (await lc.createOffer()).sdp;
                console.log('SDP of Sender');
                await lc.setLocalDescription({ sdp: SDP, type: "offer" });
                console.log('local description set');
                socket.emit("offer", {
                    roomId: roomId,
                    SDP: SDP
                })
            }
        });

        socket.on("offer", async ({ roomId, SDP }) => {
            console.log("9. Send answer please");
            setLobby(false);
            const rc = new RTCPeerConnection();
            const stream = new MediaStream();
            
            // if(!remoteVideoRef.current) return;
            if(remoteVideoRef.current)
                remoteVideoRef.current.srcObject = stream;
            rc.ontrack = async (e) => {
                console.log('10. Inside ontrack');
                // if(!remoteVideoRef.current) return;
                // @ts-ignore
                // remoteVideoRef.current.srcObject.addTrack(e.track);

                console.log(remoteVideoRef.current.srcObject);
                console.log(e.track);
                if(e.type == "audio") {
                    // setRemoteAudioTrack(e.track);
                    //@ts-ignore
                    remoteVideoRef.current.srcObject.addTrack(e.track);
                } else {
                    // setRemoteVideoTrack(e.track);
                    //@ts-ignore
                    remoteVideoRef.current.srcObject.addTrack(e.track);
                }
                //@ts-ignore
                if(remoteVideoRef.current && remoteVideoRef.current.paused){
                    await remoteVideoRef.current.play();
                }
            }
            // to ensure icecandidates from local find remote connection
            setReceivePC(rc);

            await rc.setRemoteDescription({ sdp: SDP, type: "offer" });
            const sdp = (await rc.createAnswer()).sdp;
            console.log('SDP of Receiver');
            await rc.setLocalDescription({ sdp: sdp, type: "answer" });
            console.log('answer local description set');

            // if(remoteVideoRef.current)
            //     remoteVideoRef.current.srcObject = stream;
            // console.log(remoteVideoRef.current.srcObject);
            setRemoteMediaStream(stream);
            setReceivePC(rc);

            window.pcr = rc;

            rc.onicecandidate = async (e) => {
                if(!e.candidate) return;

                console.log("11. On ice candidate on receiving side "+JSON.stringify(e.candidate));
                if(e.candidate) {
                    console.log('12. Inside rc.oncandidate');

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

        socket.on("answer", ({ roomId, SDP }) => {
            setLobby(false);
            setSendPC(lc => {
                lc?.setRemoteDescription({
                    sdp: SDP,
                    type: "answer"
                })
                return lc;
            })
            console.log("13. Connection done");
        });

        socket.on("lobby", () => {
            setLobby(true);
        })
        socket.on("room", ({ roomId }) => {
            setRoom(roomId);
        })

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            console.log("14. add ice candidate from remote");
            console.log({ candidate, type });
            if (type == "sender") {
                setReceivePC(pc => {
                    if (!pc) {
                        console.error("receicng pc nout found")
                    } else {
                        // console.error(pc.ontrack)
                        console.log('found');
                    }
                    // console.log(pc?.remoteDescription);
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendPC(pc => {
                    if (!pc) {
                        console.error("sending pc nout found")
                    } else {
                        // console.error(pc.ontrack)
                    }
                    console.log(pc?.remoteDescription);
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        }) 

        socket.on("close", () => {
            // console.log("Inside close");
            window.location.reload();
            socket.close();
        })

        setSocket(socket);

        return () => {
            sendPC?.close();
            receivePC?.close();
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