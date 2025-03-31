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
    const [sendPC, setSendPC] = useState<RTCPeerConnection>();
    const [receivePC, setReceivePC] = useState<RTCPeerConnection>();
    // const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack>();
    // const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack>();
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream>();
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const socket: Socket = io(URL);
        // socket.emit('join', {
        //     name: name
        // });
        console.log('4. Inside useEffect '+socket.id);

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
                console.log("7. Receiving ice candidate locally "+JSON.stringify(e.candidate));
                if(e.candidate) {
                    console.log('8. Inside lc.oncandidate');
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
            if(remoteVideoRef.current)
                remoteVideoRef.current.srcObject = stream;
            rc.ontrack = async (e) => {
                console.log('10. Inside ontrack');
                // if(!remoteVideoRef.current) return;
                // @ts-ignore
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
                await remoteVideoRef.current.play();
            }
            await rc.setRemoteDescription({ sdp: SDP, type: "offer" });
            const sdp = (await rc.createAnswer()).sdp;
            console.log('SDP of Receiver');
            await rc.setLocalDescription({ sdp: sdp, type: "answer" });
            console.log('answer local description set');

            if(remoteVideoRef.current)
                remoteVideoRef.current.srcObject = stream;
            // console.log(remoteVideoRef.current.srcObject);
            setRemoteMediaStream(stream);
            setReceivePC(rc);


            window.pcr = rc;
            // rc.ontrack = (e) => {
            //     alert('10. Inside ontrack '+e);
            // }
            // rc.ontrack = ({ track, type }) => {
            //     console.log('10. Inside ontrack');
            //     if(!remoteVideoRef.current) return;

            //     if(type == "audio") {
            //         // setRemoteAudioTrack(track);
            //         //@ts-ignore
            //         remoteVideoRef.current.srcObject.addTrack(track);
            //     } else {
            //         // setRemoteVideoTrack(track);
            //         //@ts-ignore
            //         remoteVideoRef.current.srcObject.addTrack(track);
            //     }
            //     remoteVideoRef.current.play();
            // }

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
            // setTimeout(() => {
            //     const track1 = rc.getTransceivers()[0].receiver.track
            //     const track2 = rc.getTransceivers()[1].receiver.track
            //     console.log(track1);
            //     if (track1.kind === "video") {
            //         setRemoteAudioTrack(track2)
            //         setRemoteVideoTrack(track1)
            //     } else {
            //         setRemoteAudioTrack(track1)
            //         setRemoteVideoTrack(track2)
            //     }
            //     //@ts-ignore
            //     remoteVideoRef.current.srcObject.addTrack(track1)
            //     //@ts-ignore
            //     remoteVideoRef.current.srcObject.addTrack(track2)
            //     //@ts-ignore
            //     remoteVideoRef.current.play();
            //     // if (type == 'audio') {
            //     //     // setRemoteAudioTrack(track);
            //     //     // @ts-ignore
            //     //     remoteVideoRef.current.srcObject.addTrack(track)
            //     // } else {
            //     //     // setRemoteVideoTrack(track);
            //     //     // @ts-ignore
            //     //     remoteVideoRef.current.srcObject.addTrack(track)
            //     // }
            //     // //@ts-ignore
            // }, 5000)
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

        socket.on("add-ice-candidate", ({ candidate, type }) => {
            console.log("14. add ice candidate from remote");
            console.log({ candidate, type });
            if (type == "sender") {
                setReceivePC(pc => {
                    if (!pc) {
                        console.error("receicng pc nout found")
                    } else {
                        console.error(pc.ontrack)
                    }
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
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        }) 

        setSocket(socket);
    }, []);

    useEffect(() => {
        console.log("20. localvideoref");

        (async() => {
        if (localVideoRef && localVideoRef.current) {
            // if (!localVideoTrack) return;
            console.log("21. localvideoref inside if");
            
            if(localVideoTrack)
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
            await localVideoRef.current.play();
        }})();
    }, [localVideoRef]);

    return (
        <div>
            <div className="flex justify-between w-screen">
                <div className='w-full'>
                    <video autoPlay className='w-full' ref={localVideoRef}></video>
                </div>
                <div className='w-full'>
                    { lobby ? 'Waiting to connect you with someone...': null }
                    <video autoPlay className='w-full' ref={remoteVideoRef}></video>
                </div>
            </div>
        </div>
    );
}