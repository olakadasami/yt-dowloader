import { useState } from "react";

export default function Hero() {
  const [text, setText] = useState("");

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch (err) {
      console.error("Failed to read clipboard: ", err);
      alert(
        "Clipboard access denied. Try using HTTPS or allowing permissions."
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };
  const handleClick = async () => {
    const res = await fetch("/api/hello/samuel");
    const json = await res.json();
    console.log(json);
    if (!text) handlePaste();
  };
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold">Free Online Video Downloader</h1>

          <div className="join">
            <label className="input validator join-item">
              <svg
                className="h-[1em] opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </g>
              </svg>
              <input
                type="url"
                required
                placeholder="Paste link here"
                value={text}
                onChange={handleInputChange}
                pattern="^(https?://)?([a-zA-Z0-9]([a-zA-Z0-9\-].*[a-zA-Z0-9])?\.)+[a-zA-Z].*$"
                title="Must be valid URL"
              />
            </label>
            <button className="btn btn-neutral join-item" onClick={handleClick}>
              Paste & Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
