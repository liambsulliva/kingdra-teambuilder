"use client"
import "@/app/globals.css";
import Draggable from 'react-draggable';

export default function PokeFinderCard() {
    return (
        <Draggable>
            <div className="bg-[#fff] h-32 w-32 rounded shadow cursor-pointer"/>
        </Draggable>
    );
}