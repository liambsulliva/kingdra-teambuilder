import React, { useEffect, useState } from "react";
import Layout from "./layout";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Home() {
  return (
      <Layout>
        <Header />
          <div className="h-screen" />
        <Footer />
      </Layout>
  );
}
