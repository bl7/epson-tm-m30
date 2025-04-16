// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";

// Add type safety for the custom window property
declare global {
  interface Window {
    epsonPrinter?: USBDevice;
  }
}

export default function Home() {
  const [printerText, setPrinterText] = useState<string>("");
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStatus("Ready to connect to printer");
    }
  }, []);

  const connectToPrinter = async () => {
    try {
      setStatus("Connecting to printer...");

      // Check if Web USB API is available
      if (!navigator.usb) {
        setStatus("Web USB API is not supported in this browser");
        return;
      }

      // Request device with Epson TM-M30 printer's vendor ID (0x04b8)
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x04b8 }],
      });

      await device.open();

      // Select configuration #1
      await device.selectConfiguration(1);

      // Claim interface #0
      await device.claimInterface(0);

      setIsPrinterConnected(true);
      setStatus("Printer connected successfully!");

      // Store the device in window to use it later for printing
      window.epsonPrinter = device;
    } catch (error: any) {
      console.error("Error connecting to printer:", error);
      setStatus(`Failed to connect: ${error.message}`);
    }
  };

  const printText = async () => {
    if (!window.epsonPrinter || !isPrinterConnected) {
      setStatus("Printer not connected. Please connect first.");
      return;
    }

    try {
      setStatus("Printing...");

      // ESC/POS commands for printing text
      const ESC = 0x1b;
      const GS = 0x1d;
      const commands = new Uint8Array([
        ESC,
        0x40, // Initialize printer
        ESC,
        0x21,
        0x00, // Standard text mode
      ]);

      // Convert text to Uint8Array
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(printerText);

      // Combine commands and text
      const data = new Uint8Array(commands.length + textBytes.length + 8);
      data.set(commands);
      data.set(textBytes, commands.length);

      // Add line feed and cut commands
      data.set([ESC, 0x64, 0x05], commands.length + textBytes.length); // Feed 5 lines
      data.set([GS, 0x56, 0x00], commands.length + textBytes.length + 3); // Cut paper

      // Send data to the printer
      await window.epsonPrinter.transferOut(1, data);

      setStatus("Printed successfully!");
    } catch (error: any) {
      console.error("Error printing:", error);
      setStatus(`Printing failed: ${error.message}`);
    }
  };

  return (
    <div className="container">
      <main>
        <h1 className="title">Epson TM-M30 Printer Interface</h1>

        <div className="status-box">
          <p>Status: {status}</p>
          <button
            onClick={connectToPrinter}
            className={`connect-button ${
              isPrinterConnected ? "connected" : ""
            }`}
          >
            {isPrinterConnected ? "Reconnect Printer" : "Connect to Printer"}
          </button>
        </div>

        <div className="print-area">
          <textarea
            value={printerText}
            onChange={(e) => setPrinterText(e.target.value)}
            placeholder="Enter text to print..."
            rows={10}
            className="text-input"
          />

          <button
            onClick={printText}
            className="print-button"
            disabled={!isPrinterConnected || !printerText.trim()}
          >
            Print Text
          </button>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 2rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 800px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .title {
          margin-bottom: 2rem;
          line-height: 1.15;
          font-size: 2rem;
          text-align: center;
          color: #333;
        }

        .status-box {
          width: 100%;
          margin-bottom: 1.5rem;
          padding: 1rem;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          text-align: center;
          background-color: #f9f9f9;
        }

        .print-area {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .text-input {
          width: 100%;
          margin-bottom: 1rem;
          padding: 0.8rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
          resize: vertical;
          font-family: inherit;
        }

        .connect-button {
          background-color: #0070f3;
          color: white;
          margin-top: 1rem;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .connect-button.connected {
          background-color: #28a745;
        }

        .connect-button:hover {
          background-color: #0051a8;
        }

        .connect-button.connected:hover {
          background-color: #218838;
        }

        .print-button {
          background-color: #f03a00;
          color: white;
          font-weight: bold;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .print-button:hover {
          background-color: #d03000;
        }

        .print-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
