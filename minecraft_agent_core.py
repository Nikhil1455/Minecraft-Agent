import socket
import time
import json
import requests
import logging
from datetime import datetime

# Configure Logging
logging.basicConfig(
    filename='agent_actions.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class RCONClient:
    """Low-level RCON client to talk to Minecraft Server"""
    def __init__(self, host, port, password):
        self.host = host
        self.port = port
        self.password = password
        self.sock = None
        self.auth_id = None

    def connect(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(10)
            self.sock.connect((self.host, self.port))
            logging.info(f"Connected to RCON at {self.host}:{self.port}")

            # Authenticate
            self.auth_id = self._send_packet(2, self.password)
            if self.auth_id == -1:
                raise Exception("RCON Authentication Failed")
            logging.info("RCON Authenticated successfully")
            return True
        except Exception as e:
            logging.error(f"Connection failed: {e}")
            return False

    def _send_packet(self, p_type, body):
        # Simple RCON packet implementation
        if not self.sock: return -1
        try:
            packet = self._make_packet(p_type, body)
            self.sock.sendall(packet)
            # Receive response
            resp_len = int.from_bytes(self.sock.recv(4), 'little')
            resp_id = int.from_bytes(self.sock.recv(4), 'little')
            resp_type = int.from_bytes(self.sock.recv(4), 'little')
            resp_body = self.sock.recv(resp_len - 4).decode('utf-8', errors='ignore')
            return resp_id
        except Exception as e:
            logging.error(f"Packet error: {e}")
            return -1

    def _make_packet(self, p_type, body):
        body_bytes = body.encode('utf-8')
        length = 10 + len(body_bytes)
        packet = length.to_bytes(4, 'little')
        packet += self.auth_id.to_bytes(4, 'little') if p_type != 2 else (0).to_bytes(4, 'little')
        packet += p_type.to_bytes(4, 'little')
        packet += body_bytes
        packet += b'\x00\x00'
        return packet

    def send_command(self, command):
        if not self.sock:
            return "Not connected"
        logging.info(f"Executing Command: {command}")
        self._send_packet(2, command) # Type 2 is EXEC
        # We don't always wait for response for fire-and-forget, but for info we might
        return f"Command sent: {command}"

    def disconnect(self):
        if self.sock:
            self.sock.close()
            self.sock = None

class MinecraftAgent:
    """The Brain: Connects LLM to RCON"""
    def __init__(self):
        self.rcon = None
        self.api_key = ""
        self.api_provider = "groq" # groq, gemini, local
        self.base_url = "https://api.groq.com/openai/v1"
        self.model_name = "llama-4-scout" # Default to requested model
        self.master_name = "Player"
        self.memory = []

    def connect_server(self, ip, port, password):
        self.rcon = RCONClient(ip, int(port), password)
        return self.rcon.connect()

    def configure_ai(self, provider, api_key, base_url, model):
        self.api_provider = provider
        self.api_key = api_key
        self.base_url = base_url if base_url else self._get_default_url(provider)
        # Use the model specified by user (GUI passes it), fallback to llama-4-scout
        self.model_name = model if model else "llama-4-scout"
        logging.info(f"AI Configured: {provider}, Model: {self.model_name}")

    def _get_default_url(self, provider):
        if provider == "groq":
            return "https://api.groq.com/openai/v1"
        elif provider == "gemini":
            return "https://generativelanguage.googleapis.com/v1beta/openai/" # Gemini OpenAI compat
        elif provider == "local":
            return "http://localhost:11434/v1"
        return ""

    def add_to_memory(self, text):
        self.memory.append({"role": "user", "content": text})
        if len(self.memory) > 10: # Keep last 10 interactions
            self.memory.pop(0)

    def think_and_act(self, user_input):
        """
        1. Send input to LLM with instructions to output JSON commands.
        2. Parse JSON.
        3. Execute RCON commands.
        """
        if not self.rcon or not self.rcon.sock:
            return "Error: Not connected to server."

        system_prompt = f"""
        You are a Minecraft Agent playing with {self.master_name}.
        Your goal is to help them build, explore, and survive.

        IMPORTANT: You must respond in valid JSON format ONLY.
        Do not write conversational text outside the JSON.

        Format:
        {{
            "chat_response": "A short, friendly response to the player.",
            "commands": [
                "say Hello!",
                "give {self.master_name} diamond 10",
                "tp {self.master_name} ~ ~5 ~",
                "time set day",
                "fill ~10 ~ ~10 ~-10 ~-5 ~-10 stone"
            ]
        }}

        If no action is needed, return empty commands list.
        Current Memory: {json.dumps(self.memory[-3:])}
        """

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]

        try:
            # Call LLM
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            # Handle different API formats slightly if needed, but sticking to OpenAI standard
            payload = {
                "model": self.model_name,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500
            }

            # Special handling for Local/Ollama if base_url differs significantly
            if "localhost" in self.base_url:
                # Ollama specific sometimes needs different structure, but trying standard first
                pass

            response = requests.post(f"{self.base_url}/chat/completions", json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            ai_content = data['choices'][0]['message']['content']

            # Clean up markdown code blocks if LLM adds them
            if ai_content.startswith("```json"):
                ai_content = ai_content.replace("```json", "").replace("```", "")
            elif ai_content.startswith("```"):
                ai_content = ai_content.replace("```", "")

            result = json.loads(ai_content.strip())

            # Execute Commands
            executed = []
            if "commands" in result:
                for cmd in result["commands"]:
                    if cmd.strip():
                        status = self.rcon.send_command(cmd)
                        executed.append(cmd)
                        time.sleep(0.2) # Prevent spam

            # Update Memory
            self.add_to_memory(user_input)
            self.add_to_memory(f"Executed: {executed}")

            return result.get("chat_response", "Done.") + f" [Actions: {len(executed)}]"

        except Exception as e:
            logging.error(f"AI Error: {e}")
            return f"Error processing request: {str(e)}. Ensure API Key and Model Name are correct."

    def disconnect(self):
        if self.rcon:
            self.rcon.disconnect()
