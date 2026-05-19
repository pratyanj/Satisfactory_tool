import React from 'react';
import './bodyFrame.css';

interface BodyFrameProps {
  children: React.ReactNode;
}

export function BodyFrame({ children }: BodyFrameProps) {
  return (
    <div className="sf-body-frame-wrapper">
      <div className="sf-body-frame-container">
        
        {/* Top/Bottom Caution Stripes */}
        <div className="sf-frame-caution sf-frame-caution-top" />
        <div className="sf-frame-caution sf-frame-caution-bottom" />

        {/* Glowing Edge Accents */}
        <div className="sf-frame-edge-light sf-frame-edge-light-top" />
        <div className="sf-frame-edge-light sf-frame-edge-light-top-right" />
        <div className="sf-frame-edge-light sf-frame-edge-light-bottom" />
        <div className="sf-frame-edge-light sf-frame-edge-light-bottom-right" />
        <div className="sf-frame-edge-light sf-frame-edge-light-left" />
        <div className="sf-frame-edge-light sf-frame-edge-light-left-bottom" />
        <div className="sf-frame-edge-light sf-frame-edge-light-right" />
        <div className="sf-frame-edge-light sf-frame-edge-light-right-bottom" />

        {/* Corners */}
        <div className="sf-frame-corner sf-frame-corner-tl">
          <div className="sf-frame-screw" />
        </div>
        <div className="sf-frame-corner sf-frame-corner-tr">
          <div className="sf-frame-screw" />
        </div>
        <div className="sf-frame-corner sf-frame-corner-bl">
          <div className="sf-frame-screw" />
        </div>
        <div className="sf-frame-corner sf-frame-corner-br">
          <div className="sf-frame-screw" />
        </div>

        {/* Bottom Right Logo */}
        {/* <div className="sf-frame-logo">
          <div className="sf-frame-logo-main">SATISFACTORY <span>TOOL</span></div>
          <div className="sf-frame-logo-sub">made by pratyanj</div>
        </div> */}

        {/* Main Content Area */}
        <div className="sf-body-frame-content">
          {children}
        </div>
      </div>
    </div>
  );
}
