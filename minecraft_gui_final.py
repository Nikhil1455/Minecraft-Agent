import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import json
import os
from minecraft_agent_core import MinecraftAgent

class MinecraftAgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🤖 Minecraft AI Agent - Play With Me!")
        self.root.geometry("900x750")
        self.root.configure(bg="#1e1e2e")

        # Style Configuration
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#1e1e2e")
        style.configure("TLabel", background="#1e1e2e", foreground="#cdd6f4", font=("Segoe UI", 10))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"), foreground="#89b4fa")
        style.configure("TButton", font=("Segoe UI", 10, "bold"), padding=6)
        style.map("TButton", background=[("active", "#585b70")])
        style.configure("TEntry", fieldbackground="#313244", foreground="#cdd6f4", borderwidth=0)
        style.configure("TCombobox", fieldbackground="#313244", foreground="#cdd6f4")

        self.agent = MinecraftAgent()
        self.config_file = "agent_config.json"
        self.is_connected = False

        self.load_config()
        self.create_widgets()

    def load_config(self):
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    self.saved_config = config
            except:
                self.saved_config = {}
        else:
            self.saved_config = {}

    def save_config(self):
        config = {
            "provider": self.provider_var.get(),
            "api_key": self.api_key_entry.get(),
            "base_url": self.base_url_entry.get(),
            "model": self.model_entry.get(),
            "server_ip": self.ip_entry.get(),
            "rcon_port": self.port_entry.get(),
            "rcon_pass": self.pass_entry.get(),
            "master_name": self.master_entry.get()
        }
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=4)

    def create_widgets(self):
        # Main Container
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # --- Top Section: Connection & Config ---
        config_frame = ttk.LabelFrame(main_frame, text="⚙️ Agent Configuration", padding=15)
        config_frame.pack(fill=tk.X, pady=(0, 15))

        # Row 0: Provider & Model
        ttk.Label(config_frame, text="AI Provider:", style="Header.TLabel").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.provider_var = tk.StringVar(value=self.saved_config.get("provider", "Groq"))
        provider_combo = ttk.Combobox(config_frame, textvariable=self.provider_var, values=["Groq", "Gemini", "Local"], state="readonly", width=20)
        provider_combo.grid(row=0, column=1, sticky=tk.W, padx=10, pady=5)
        provider_combo.bind("<<ComboboxSelected>>", self.on_provider_change)

        ttk.Label(config_frame, text="Model Name:", style="Header.TLabel").grid(row=0, column=2, sticky=tk.W, padx=20, pady=5)
        self.model_entry = ttk.Entry(config_frame, width=25)
        self.model_entry.insert(0, self.saved_config.get("model", "llama-4-scout")) # Default to requested model
        self.model_entry.grid(row=0, column=3, sticky=tk.W, padx=10, pady=5)
        ttk.Label(config_frame, text="(e.g. llama-4-scout, llama3.2)", font=("Segoe UI", 8), foreground="#a6adc8").grid(row=0, column=4, sticky=tk.W)

        # Row 1: API Key & Base URL
        ttk.Label(config_frame, text="API Key:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.api_key_entry = ttk.Entry(config_frame, width=30, show="*")
        self.api_key_entry.insert(0, self.saved_config.get("api_key", ""))
        self.api_key_entry.grid(row=1, column=1, columnspan=2, sticky=tk.W, padx=10, pady=5)

        ttk.Label(config_frame, text="Base URL (Local):").grid(row=1, column=3, sticky=tk.W, padx=20, pady=5)
        self.base_url_entry = ttk.Entry(config_frame, width=25)
        default_url = self.saved_config.get("base_url", "")
        if not default_url and self.provider_var.get() == "Local":
            default_url = "http://localhost:11434/v1"
        self.base_url_entry.insert(0, default_url)
        self.base_url_entry.grid(row=1, column=4, sticky=tk.W, padx=10, pady=5)

        # Separator
        ttk.Separator(config_frame, orient='horizontal').grid(row=2, column=0, columnspan=5, sticky='ew', pady=15)

        # Row 3: Server Details
        ttk.Label(config_frame, text="Server IP:", style="Header.TLabel").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.ip_entry = ttk.Entry(config_frame, width=20)
        self.ip_entry.insert(0, self.saved_config.get("server_ip", "localhost"))
        self.ip_entry.grid(row=3, column=1, sticky=tk.W, padx=10, pady=5)

        ttk.Label(config_frame, text="RCON Port:").grid(row=3, column=2, sticky=tk.W, padx=20, pady=5)
        self.port_entry = ttk.Entry(config_frame, width=10)
        self.port_entry.insert(0, self.saved_config.get("rcon_port", "25575"))
        self.port_entry.grid(row=3, column=3, sticky=tk.W, padx=10, pady=5)

        ttk.Label(config_frame, text="Password:").grid(row=3, column=4, sticky=tk.W, padx=20, pady=5)
        self.pass_entry = ttk.Entry(config_frame, width=15, show="*")
        self.pass_entry.insert(0, self.saved_config.get("rcon_pass", ""))
        self.pass_entry.grid(row=3, column=5, sticky=tk.W, padx=10, pady=5)

        # Row 4: Master Name
        ttk.Label(config_frame, text="Your Username:", style="Header.TLabel").grid(row=4, column=0, sticky=tk.W, pady=10)
        self.master_entry = ttk.Entry(config_frame, width=20)
        self.master_entry.insert(0, self.saved_config.get("master_name", "Player"))
        self.master_entry.grid(row=4, column=1, sticky=tk.W, padx=10, pady=10)

        # Connect Button
        self.connect_btn = ttk.Button(config_frame, text="🔌 Connect to Server", command=self.toggle_connection)
        self.connect_btn.grid(row=4, column=2, columnspan=4, sticky=tk.EW, padx=20, pady=10)

        # --- Middle Section: Chat & Actions ---
        action_frame = ttk.Frame(main_frame)
        action_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 15))

        # Left: Chat Input
        chat_frame = ttk.LabelFrame(action_frame, text="💬 Talk to Agent", padding=10)
        chat_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))

        self.chat_display = scrolledtext.ScrolledText(chat_frame, height=10, state='disabled', bg="#313244", fg="#cdd6f4", font=("Consolas", 10))
        self.chat_display.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        input_frame = ttk.Frame(chat_frame)
        input_frame.pack(fill=tk.X)

        self.input_entry = ttk.Entry(input_frame, font=("Segoe UI", 11))
        self.input_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        self.input_entry.bind("<Return>", lambda e: self.send_message())

        send_btn = ttk.Button(input_frame, text="Send ➤", command=self.send_message)
        send_btn.pack(side=tk.RIGHT)

        # Right: Quick Actions
        quick_frame = ttk.LabelFrame(action_frame, text="⚡ Quick Actions", padding=10)
        quick_frame.pack(side=tk.RIGHT, fill=tk.Y)

        actions = [
            ("☀️ Set Day", "time set day"),
            ("🌙 Set Night", "time set night"),
            ("🌧️ Stop Rain", "weather clear"),
            ("❤️ Heal Me", f"effect give {self.master_entry.get()} regeneration 5 2"),
            ("🎒 Give Diamond", f"give {self.master_entry.get()} diamond 10"),
            ("🏠 Build Small House", "fill ~10 ~ ~10 ~-5 ~-5 ~-5 oak_planks"),
            ("🔮 Teleport Up", f"tp {self.master_entry.get()} ~ ~10 ~"),
        ]

        for txt, cmd in actions:
            btn = ttk.Button(quick_frame, text=txt, command=lambda c=cmd: self.quick_action(c), width=20)
            btn.pack(pady=5, fill=tk.X)

        # --- Bottom Section: Logs ---
        log_frame = ttk.LabelFrame(main_frame, text="📜 Activity Log", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_display = scrolledtext.ScrolledText(log_frame, height=8, state='disabled', bg="#11111b", fg="#a6e3a1", font=("Consolas", 9))
        self.log_display.pack(fill=tk.BOTH, expand=True)

        # Initial Log
        self.log("Ready. Configure settings and click Connect.")

    def on_provider_change(self, event):
        provider = self.provider_var.get()
        if provider == "Local":
            self.base_url_entry.delete(0, tk.END)
            self.base_url_entry.insert(0, "http://localhost:11434/v1")
        elif provider == "Groq":
            self.base_url_entry.delete(0, tk.END)
            self.base_url_entry.insert(0, "https://api.groq.com/openai/v1")
        elif provider == "Gemini":
            self.base_url_entry.delete(0, tk.END)
            self.base_url_entry.insert(0, "https://generativelanguage.googleapis.com/v1beta/openai/")

    def toggle_connection(self):
        if self.is_connected:
            self.agent.disconnect()
            self.is_connected = False
            self.connect_btn.config(text="🔌 Connect to Server")
            self.log("Disconnected from server.")
            return

        # Validate
        if not self.ip_entry.get() or not self.pass_entry.get():
            messagebox.showerror("Error", "Please enter Server IP and RCON Password")
            return

        # Configure Agent
        self.agent.configure_ai(
            provider=self.provider_var.get().lower(),
            api_key=self.api_key_entry.get(),
            base_url=self.base_url_entry.get(),
            model=self.model_entry.get()
        )
        self.agent.master_name = self.master_entry.get()

        # Connect Thread
        def connect_thread():
            success = self.agent.connect_server(self.ip_entry.get(), self.port_entry.get(), self.pass_entry.get())
            self.root.after(0, lambda: self.on_connect_result(success))

        threading.Thread(target=connect_thread, daemon=True).start()
        self.log("Connecting...")

    def on_connect_result(self, success):
        if success:
            self.is_connected = True
            self.connect_btn.config(text="🔴 Disconnect")
            self.log("✅ Connected to Minecraft Server!")
            self.save_config()
        else:
            messagebox.showerror("Connection Failed", "Could not connect to RCON. Check IP, Port, Password, and ensure RCON is enabled in server.properties")
            self.log("❌ Connection Failed.")

    def send_message(self):
        msg = self.input_entry.get().strip()
        if not msg or not self.is_connected:
            if not self.is_connected:
                self.log("Not connected!")
            return

        self.input_entry.delete(0, tk.END)
        self.append_chat(f"You: {msg}")
        self.log(f"Processing: {msg}")

        def process_thread():
            response = self.agent.think_and_act(msg)
            self.root.after(0, lambda: self.handle_response(response))

        threading.Thread(target=process_thread, daemon=True).start()

    def handle_response(self, response):
        self.append_chat(f"Agent: {response}")
        self.log(f"Response: {response}")

    def quick_action(self, cmd):
        if not self.is_connected:
            messagebox.showwarning("Not Connected", "Connect to server first!")
            return
        # Direct execution without AI for quick actions
        self.agent.rcon.send_command(cmd)
        self.log(f"Quick Action Executed: {cmd}")
        self.append_chat(f"System: Executed '{cmd}'")

    def append_chat(self, text):
        self.chat_display.config(state='normal')
        self.chat_display.insert(tk.END, text + "\n\n")
        self.chat_display.see(tk.END)
        self.chat_display.config(state='disabled')

    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_display.config(state='normal')
        self.log_display.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_display.see(tk.END)
        self.log_display.config(state='disabled')

if __name__ == "__main__":
    from datetime import datetime
    root = tk.Tk()
    app = MinecraftAgentGUI(root)
    root.mainloop()
