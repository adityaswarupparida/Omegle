import { useState } from "react"
import { useNavigate } from "react-router-dom";

export const Landing = () => {
    const [name, setName] = useState("");
    const navigate = useNavigate();

    return (
        <div className="p-5">
            <input className="border border-neutral-300 rounded p-2" type="text" 
                   onChange={(evt) => setName(evt.target.value)}
            ></input>
            <button className="bg-amber-300 cursor-pointer hover:bg-amber-400 rounded p-2" 
                    onClick={() => {
                        navigate(`/room?name=${name}`);
                    }}
            >Join Room</button>
        </div>
    );
}