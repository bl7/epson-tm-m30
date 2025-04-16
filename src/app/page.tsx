// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

export default function Home() {
  const [text, setText] = useState("");
  const [printerConnected, setPrinterConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // We need to keep the epsonPrinter reference in a way that survives re-renders
  // Using a ref would be ideal, but for simplicity here we'll use the window object

  useEffect(() => {
    // Once the SDK script is loaded, initialize the printer
    if (scriptLoaded) {
      initializePrinter();
    }

    // Cleanup function
    return () => {
      if (window.epsonPrinter) {
        window.epsonPrinter.disconnect();
      }
    };
  }, [scriptLoaded]);

  const initializePrinter = () => {
    try {
      // Check if the SDK is loaded properly
      if (window.epson && window.epson.ePOSDevice) {
        // Store the printer instance in the window to access it across component renders
        window.epsonPrinter = new window.epson.ePOSDevice();

        // Connect to the printer
        window.epsonPrinter.connect("localhost", 8008, connectCallback);

        setMessage("Initializing printer connection...");
      } else {
        setMessage("Error: Epson ePOS SDK not loaded properly");
      }
    } catch (error) {
      // setMessage(`Initialization error: ${error.message}`);
    }
  };

  const connectCallback = (resultConnect: string) => {
    if (resultConnect === "OK") {
      // Create printer object
      window.epsonPrinter.createDevice(
        "local_printer",
        window.epsonPrinter.DEVICE_TYPE_PRINTER,
        { crypto: false, buffer: false },
        printCallback
      );

      setMessage("Connected to printer service. Creating printer device...");
    } else {
      setPrinterConnected(false);
      setMessage(`Connection error: ${resultConnect}`);
    }
  };

  const printCallback = (deviceObj: any, errorCode: any) => {
    if (deviceObj) {
      // Store printer object
      window.printer = deviceObj;
      setPrinterConnected(true);
      setMessage("Printer connected successfully");
    } else {
      setPrinterConnected(false);
      setMessage(`Failed to create printer device: ${errorCode}`);
    }
  };

  const handlePrint = () => {
    if (!printerConnected) {
      setMessage("Printer not connected");
      return;
    }

    if (!text.trim()) {
      setMessage("Please enter some text to print");
      return;
    }

    try {
      const printer = window.printer;

      // Initialize printer
      printer.addTextAlign(printer.ALIGN_CENTER);
      printer.addTextSize(1, 1);
      printer.addText(text);
      printer.addFeedLine(3);
      printer.addCut(printer.CUT_FEED);

      // Send print job to the printer
      printer.send();

      setMessage("Print job sent successfully");
    } catch (error) {
      // setMessage(`Print error: ${error.message}`);
    }
  };

  return (
    <>
      <Script
        src="/epson-epos-sdk.js"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setMessage("Failed to load Epson ePOS SDK")}
      />

      <main>
        <h1 className="title">Epson TM-M30 Printer</h1>

        <div className="status">
          <p>Status: {printerConnected ? "Connected" : "Not Connected"}</p>
          <p className="message">{message}</p>
        </div>

        <div className="form">
          <textarea
            placeholder="Enter text to print..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />

          <button
            className="print-button"
            onClick={handlePrint}
            disabled={!printerConnected}
          >
            Print
          </button>
        </div>
      </main>
    </>
  );
}
