import os
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

class LlamaHandler:
    REPO_ID = "bartowski/Meta-Llama-3-8B-Instruct-GGUF"
    MODEL_FILE = "Meta-Llama-3-8B-Instruct-Q4_K_M.gguf"

    def __init__(self, model_path=None):
        if model_path is None:
            # Default to a local models directory
            model_dir = os.path.join(os.path.dirname(__file__), "models")
            if not os.path.exists(model_dir):
                os.makedirs(model_dir)
            model_path = os.path.join(model_dir, self.MODEL_FILE)
        
        self.model_path = model_path
        self.llm = None

    def download_model(self):
        if not os.path.exists(self.model_path):
            print(f"Downloading Llama 3 model ({self.MODEL_FILE})... This may take a few minutes.")
            hf_hub_download(
                repo_id=self.REPO_ID,
                filename=self.MODEL_FILE,
                local_dir=os.path.dirname(self.model_path),
                local_dir_use_symlinks=False
            )
            print("Download complete.")
        else:
            print("Model already exists.")

    def load_model(self):
        if self.llm is None:
            print("Loading Llama 3 model into memory...")
            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=4096,  # Context window
                n_threads=os.cpu_count(),
                verbose=False
            )
            print("Model loaded.")

    def generate_lineup(self, prompt):
        if self.llm is None:
            self.load_model()
        
        print("Llama 3 is analyzing your squad and generating the best lineup...")
        output = self.llm(
            f"<|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            max_tokens=1024,
            stop=["<|eot_id|>"],
            echo=False
        )
        return output["choices"][0]["text"].strip()
