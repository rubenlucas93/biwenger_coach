# Biwenger Lineup Optimizer

This tool helps you select the best starting 11 for your Biwenger team by combining:
1.  **Your Team Data**: Directly from Biwenger (recent points, status).
2.  **Expert Predictions**: Scraped from FutbolFantasy (lineup probabilities).
3.  **LLM Optimization**: Generates a tailored prompt for Llama 3 to make the final decision.

## Setup

1.  **Virtual Environment**: Already created in `venv/`.
2.  **Configuration**: 
    - Copy `.env.example` to `.env`.
    - Fill in your Biwenger credentials:
      ```bash
      BIWENGER_EMAIL=your_email@example.com
      BIWENGER_PASSWORD=your_password
      ```

## How to Run

To generate the best 11-player lineup using Llama 3:

```bash
./venv/bin/python main.py
```

*Note: The first time you run this, it will download the Llama 3 model (approx. 5GB). This might take several minutes depending on your connection.*

### Options

- `--prompt-only`: Only prints the prompt and does NOT run Llama 3.
- `--download-only`: Downloads the Llama 3 model without running the lineup optimization.
- `--email` / `--password`: Can be passed as arguments instead of using `.env`.

## How the "Algo Score" is Calculated

To ensure a deterministic and high-scoring lineup, every player is assigned a score using the following formula:

**`Score = (Probability * 0.5) + (Average Fitness * 3) + Matchup Bonus + Trend Bonus + Location Bonus`**

### 1. Starting Probability (Weight: 0.5)
- Derived from **FutbolFantasy** predictions. 
- A 100% probability adds **50 points** to the score. An 80% probability adds **40 points**.
- *Constraint*: Any player with < 50% probability is automatically excluded from the lineup.

### 2. Recent Fitness (Weight: 3.0)
- Calculated as the average of the **last 5 matches** in Biwenger.
- If a player averaged 6 points, they gain **18 points** (6 * 3).
- Non-numeric values (like 'doubt' or 'injured') in the history are treated as 0.

### 3. Matchup Difficulty (DvP)
- Based on how many points the rival team usually allows to that specific position.
- **Very Easy Matchup**: +10 points.
- **Easy Matchup**: +8 points.
- **Moderate Matchup**: +6 points.
- **Hard Matchup**: +4 points.
- **Extreme Matchup**: +2 points.

### 4. Market Trend & Location
- **Price Trend**: +1 point if the player's market value is currently rising.
- **Location**: +1 point if the player is playing at **Home**.

## Android App Setup

The project now includes an Android application built with React Native (Expo).

### 1. Start the Backend API
Run the FastAPI server on your computer:
```bash
./venv/bin/python app_api.py
```

### 2. Configure the Frontend
- Open `frontend/App.js`.
- Find the `API_BASE_URL` constant and replace `YOUR_LOCAL_IP` with your computer's local IP address (e.g., `192.168.1.50`).
- Both your computer and phone must be on the same Wi-Fi network.

### 3. Run the App
- Install dependencies (first time only):
  ```bash
  cd frontend && npm install
  ```
- Start the Expo server:
  ```bash
  npx expo start
  ```
- Install the **Expo Go** app from the Google Play Store on your phone.
- Scan the QR code displayed in your terminal with the Expo Go app to launch the Biwenger Optimizer!

