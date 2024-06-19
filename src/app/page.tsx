import React, { useEffect, useState } from "react";
import Header from "./header";

export default function Home() {
  return (
    <>
      <div className="wrapper flex flex-col h-screen">
        <Header />
      </div>
      <div className="warning-message">
        This website is only viewable in landscape mode.<br/>
        Please rotate your device.
      </div>
    </>
  );
}
