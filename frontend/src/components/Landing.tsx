import { useEffect, useRef, useState } from "react"
// import { useNavigate } from "react-router-dom";
import { Room } from "./Room";
import { Appbar } from "./Appbar";

export const Landing = () => {
    const [name, setName] = useState("");
    // const navigate = useNavigate();
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [joined, setJoined] = useState(false);

    const getCamera = async () => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        if(!videoRef.current) return;
        videoRef.current.srcObject = new MediaStream([videoTrack])
        videoRef.current.play();
    }

    useEffect(() => {
        console.log(videoRef.current);
        if(videoRef && videoRef.current) { 
            getCamera();
        }
    }, [videoRef])

    if(!joined || !localVideoTrack || !localAudioTrack) {
        return (
            <div>
                <Appbar />
                <div className="p-5 flex flex-col items-center justify-center gap-5">
                    <video autoPlay ref={videoRef} className="" width={500} height={500}></video>
                    <div>
                        <input className="border border-neutral-300 rounded p-2" type="text" 
                            onChange={(evt) => setName(evt.target.value)}
                        ></input>
                        <button className="bg-amber-400 cursor-pointer hover:bg-orange-400 rounded p-2" 
                                onClick={() => {
                                    // navigate(`/room?name=${name}`);
                                    setJoined(true);
                                }}
                        >Join Room</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Appbar />
            <Room name={name} localVideoTrack={localVideoTrack} localAudioTrack={localAudioTrack} />
        </div>
    );
}