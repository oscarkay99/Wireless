const RESPONSES = {
  greet: {
    match: /hello|hi|hey|good\s*(morning|afternoon|evening)/i,
    reply: "Hey! 👋 Welcome to Wireless. I'm here to help with repairs, pricing, or bookings. What can I help you with today?"
  },
  price: {
    match: /price|cost|how much|charge|fee|rate|expensive|cheap/i,
    reply: "Our repair prices start at:\n• iPhone screen — from ₵1,200\n• MacBook screen — from ₵2,500\n• Samsung screen — from ₵1,400\n• Battery replacements — from ₵800\n• Diagnostic fee — ₵200 (applied toward repair cost)\n\nWant an exact quote? Book a diagnostic ↓"
  },
  time: {
    match: /how long|time|fast|quick|same.day|today|wait|duration/i,
    reply: "Most repairs are done same day ⚡\n• Screen replacements: 30–60 mins\n• Battery swaps: under 1 hour\n• Logic board / water damage: 1–3 days\n\nWalk ins welcome — no appointment needed for most repairs."
  },
  warranty: {
    match: /warrant|guarantee|cover|break again|defect/i,
    reply: "Every repair comes with our lifetime warranty 🛡️\n\nIf the same issue comes back due to our work or the parts we used, we fix it completely free. No questions asked."
  },
  devices: {
    match: /device|fix|repair|iphone|macbook|ipad|samsung|airpod|watch|iwatch|galaxy/i,
    reply: "We repair:\n📱 iPhone (all models)\n💻 MacBook (Air & Pro)\n⌚ Apple Watch (all Series)\n🎧 AirPods & AirPods Pro\n📱 Samsung Galaxy\n📋 iPad & iPad Pro\n\nNot sure if we cover your model? Just ask!"
  },
  location: {
    match: /where|location|address|find you|come in|shop|store|near/i,
    reply: "📍 17 Jungle Avenue\nEast Legon, Accra, Ghana\n\n🕐 Mon–Fri: 9AM – 7PM\n🕐 Sat: 10AM – 5PM\n🕐 Sun: Closed\n\nWalk-ins welcome anytime during business hours!"
  },
  book: {
    match: /book|appoint|schedul|reserv|slot/i,
    reply: "Book in under 2 minutes — no waiting! 📅\n\nHead to our contact page to pick your device, describe the issue, and choose a time. A ₵200 diagnostic fee applies and is credited toward your repair if you proceed."
  },
  thanks: {
    match: /thank|thanks|cheers|great|awesome|perfect|helpful/i,
    reply: "Happy to help! 😊 Is there anything else you'd like to know about our repairs or pricing?"
  },
  fallback: "I'm not sure about that one — but our team can answer any question directly! 📞 Call us at +233 20 003 9371 or book a diagnostic (₵200, credited toward your repair) and we'll take a look in person."
};

const QUICK_REPLIES = [
  { label: "💰 Pricing",     text: "How much does a repair cost?" },
  { label: "⏱ How long?",   text: "How long does a repair take?" },
  { label: "🛡 Warranty",    text: "What is your warranty policy?" },
  { label: "📍 Location",    text: "Where are you located?" },
  { label: "📅 Book",        text: "I want to book a repair" },
];

function getReply(message) {
  for (const key of Object.keys(RESPONSES)) {
    if (key === 'fallback') continue;
    if (RESPONSES[key].match && RESPONSES[key].match.test(message)) {
      return RESPONSES[key].reply;
    }
  }
  return RESPONSES.fallback;
}

export function initChatbot() {
  const widget = document.createElement('div');
  widget.id = 'cw-widget';
  widget.innerHTML = `
    <div id="cw-launcher">
      <span id="cw-label">FixBot <i class="ph-fill ph-sparkle"></i></span>
      <button id="cw-toggle" aria-label="Open chat" title="Chat with FixBot">
        <i class="ph ph-headset" id="cw-open-icon"></i>
        <i class="ph ph-x" id="cw-close-icon" style="display:none;"></i>
        <span id="cw-badge" style="display:none;">1</span>
      </button>
    </div>

    <div id="cw-window" aria-live="polite">
      <div id="cw-header">
        <div id="cw-avatar"><i class="ph ph-headset"></i></div>
        <div>
          <div id="cw-title">FixBot <span id="cw-title-badge">AI</span></div>
          <div id="cw-status"><span id="cw-dot"></span> Online now</div>
        </div>
        <button id="cw-close-btn" aria-label="Close chat"><i class="ph ph-x"></i></button>
      </div>

      <div id="cw-messages"></div>

      <div id="cw-quick-replies"></div>

      <div id="cw-input-row">
        <input id="cw-input" type="text" placeholder="Ask us anything…" autocomplete="off" maxlength="300">
        <button id="cw-send" aria-label="Send"><i class="ph-fill ph-paper-plane-tilt"></i></button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #cw-widget {
      position: fixed;
      bottom: 1in;
      right: 1.5rem;
      z-index: 9999;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    #cw-launcher {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.6rem;
    }
    #cw-label {
      background: #0a0a0a;
      color: #fff;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 2px 12px rgba(0,0,0,0.35);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translateX(8px);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    #cw-label.cw-label-visible {
      opacity: 1;
      transform: translateX(0);
    }
    #cw-label i {
      color: oklch(var(--primary-500));
      font-style: normal;
    }
    #cw-title-badge {
      display: inline-block;
      background: oklch(var(--primary-500));
      color: #fff;
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 1px 5px;
      border-radius: 4px;
      vertical-align: middle;
      margin-left: 4px;
      position: relative;
      top: -1px;
    }
    #cw-toggle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: oklch(var(--primary-500));
      border: none;
      cursor: pointer;
      color: #fff;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(204,0,0,0.45);
      transition: background 0.2s, transform 0.2s;
      position: relative;
      margin-left: auto;
    }
    #cw-toggle:hover { background: oklch(var(--primary-700)); transform: scale(1.06); }
    #cw-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 18px;
      height: 18px;
      background: #fff;
      color: oklch(var(--primary-500));
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid oklch(var(--primary-500));
    }
    #cw-window {
      display: none;
      flex-direction: column;
      width: 340px;
      max-height: 480px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.35);
      background: #141414;
      margin-bottom: 0.75rem;
      border: 1px solid rgba(255,255,255,0.07);
    }
    #cw-window.is-open { display: flex; }
    #cw-header {
      background: #0a0a0a;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    #cw-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: oklch(var(--primary-500));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    #cw-title { color: #fff; font-weight: 600; font-size: 0.9rem; }
    #cw-status { color: rgba(255,255,255,0.5); font-size: 0.72rem; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    #cw-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      animation: cw-pulse 2s infinite;
    }
    @keyframes cw-pulse {
      0%,100%{opacity:1} 50%{opacity:0.4}
    }
    #cw-close-btn {
      margin-left: auto;
      background: none;
      border: none;
      color: rgba(255,255,255,0.45);
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.25rem;
      display: flex;
      align-items: center;
    }
    #cw-close-btn:hover { color: #fff; }
    #cw-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .cw-msg {
      max-width: 82%;
      padding: 0.6rem 0.85rem;
      border-radius: 14px;
      font-size: 0.82rem;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .cw-msg.bot {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.9);
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .cw-msg.user {
      background: oklch(var(--primary-500));
      color: #fff;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .cw-typing {
      display: flex;
      gap: 4px;
      padding: 0.6rem 0.85rem;
      background: rgba(255,255,255,0.07);
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }
    .cw-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.4);
      animation: cw-bounce 1.2s infinite;
    }
    .cw-typing span:nth-child(2){ animation-delay:.2s }
    .cw-typing span:nth-child(3){ animation-delay:.4s }
    @keyframes cw-bounce {
      0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)}
    }
    #cw-quick-replies {
      padding: 0 0.75rem 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .cw-qr {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.8);
      border-radius: 9999px;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s;
    }
    .cw-qr:hover { background: rgba(204,0,0,0.2); border-color: rgba(204,0,0,0.4); color: #fff; }
    #cw-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: #0a0a0a;
    }
    #cw-input {
      flex: 1;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9999px;
      padding: 0.5rem 1rem;
      color: #fff;
      font-size: 0.82rem;
      outline: none;
      font-family: inherit;
    }
    #cw-input::placeholder { color: rgba(255,255,255,0.35); }
    #cw-input:focus { border-color: rgba(204,0,0,0.5); }
    #cw-send {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: oklch(var(--primary-500));
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    #cw-send:hover { background: oklch(var(--primary-700)); }
    @media (max-width: 480px) {
      #cw-widget {
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
      }
      #cw-launcher {
        justify-content: flex-end;
      }
      #cw-window {
        width: min(100%, calc(100vw - 2rem));
        max-height: calc(100vh - 6.5rem);
        margin-bottom: 0.75rem;
      }
      #cw-messages {
        padding: 0.85rem;
      }
      #cw-input-row {
        padding: 0.65rem;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(widget);

  const toggle      = document.getElementById('cw-toggle');
  const window_     = document.getElementById('cw-window');
  const messages    = document.getElementById('cw-messages');
  const input       = document.getElementById('cw-input');
  const sendBtn     = document.getElementById('cw-send');
  const quickReplies = document.getElementById('cw-quick-replies');
  const openIcon    = document.getElementById('cw-open-icon');
  const closeIcon   = document.getElementById('cw-close-icon');
  const badge       = document.getElementById('cw-badge');
  const label       = document.getElementById('cw-label');

  let opened = false;

  function addMessage(text, who) {
    const msg = document.createElement('div');
    msg.className = `cw-msg ${who}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'cw-typing';
    t.id = 'cw-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('cw-typing');
    if (t) t.remove();
  }

  function botReply(text) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(text, 'bot');
    }, 900 + Math.random() * 400);
  }

  function sendMessage(text) {
    text = text.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    quickReplies.innerHTML = '';
    botReply(getReply(text));
  }

  function openChat() {
    opened = true;
    window_.classList.add('is-open');
    openIcon.style.display = 'none';
    closeIcon.style.display = '';
    badge.style.display = 'none';
    label.classList.remove('cw-label-visible');
    input.focus();
    if (!messages.children.length) {
      setTimeout(() => {
        addMessage("Hi there! 👋 I'm the Wireless assistant. Ask me anything about repairs, pricing, or bookings!", 'bot');
        setTimeout(() => {
          QUICK_REPLIES.forEach(qr => {
            const btn = document.createElement('button');
            btn.className = 'cw-qr';
            btn.textContent = qr.label;
            btn.addEventListener('click', () => sendMessage(qr.text));
            quickReplies.appendChild(btn);
          });
        }, 400);
      }, 300);
    }
  }

  function closeChat() {
    opened = false;
    window_.classList.remove('is-open');
    openIcon.style.display = '';
    closeIcon.style.display = 'none';
  }

  toggle.addEventListener('click', () => opened ? closeChat() : openChat());
  document.getElementById('cw-close-btn').addEventListener('click', closeChat);

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(input.value); });

  // Slide in the FixBot label after 1.5s, badge after 4s
  setTimeout(() => {
    if (!opened) label.classList.add('cw-label-visible');
  }, 1500);
  setTimeout(() => {
    if (!opened) badge.style.display = 'flex';
  }, 4000);
}
