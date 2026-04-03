import argparse
import os
import json
from biwenger_client import BiwengerClient
from ff_scraper import FutbolFantasyScraper
from optimizer import LineupOptimizer
from llm_handler import LlamaHandler
from dotenv import load_dotenv

def get_prob_value(p):
    prob_str = str(p.get("ff_prob", "0")).replace("%", "")
    try:
        return int(prob_str)
    except:
        return 0

def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Biwenger Lineup Optimizer")
    parser.add_argument("--email", help="Biwenger email", default=os.getenv("BIWENGER_EMAIL"))
    parser.add_argument("--password", help="Biwenger password", default=os.getenv("BIWENGER_PASSWORD"))
    parser.add_argument("--prompt-only", action="store_true", help="Only output the LLM prompt")
    parser.add_argument("--download-only", action="store_true", help="Download the model and exit")
    parser.add_argument("--debug-data", action="store_true", help="Show enriched player data and exit")
    parser.add_argument("--no-chat", action="store_true", help="Disable interactive chat loop")
    parser.add_argument("--allow-subs", action="store_true", help="Account for 1 allowed substitution during jornada")
    
    args = parser.parse_args()
    
    if args.download_only:
        llama = LlamaHandler()
        llama.download_model()
        return

    if not args.email or not args.password:
        print("Error: Biwenger email and password are required. Set them as args or in .env")
        return

    # 1. Fetch Data
    client = BiwengerClient(args.email, args.password)
    if not client.login():
        print("Biwenger login failed.")
        return
    
    players, team_id_map = client.get_player_list()
    if not players:
        print("No players found in your Biwenger account.")
        return

    scraper = FutbolFantasyScraper()
    ff_probs = scraper.get_all_lineup_data()

    # 2. ALGORITHMIC OPTIMIZATION
    optimizer = LineupOptimizer(players, ff_probs)
    enriched_players = optimizer.match_players()
    
    if args.debug_data:
        print("\n" + "="*50)
        print("DEBUG DATA: ENRICHED PLAYER LIST")
        print("="*50)
        for p in sorted(enriched_players, key=lambda x: x['safe_score'], reverse=True):
            print(f"Name: {p['name']}")
            print(f"  Team: {p.get('team_name')} -> Rival: {p.get('rival_name')} ({p.get('location')})")
            print(f"  Date: {p.get('match_date')} | Matchup: {p['dvp_label']}")
            print(f"  Fitness: {p['fitness']} | Peaks: {p['peaks']} | Vol: {p['volatility']}")
            print(f"  FF Prob: {p['ff_prob']}")
            print(f"  SAFE SCORE: {p['safe_score']} | RISK SCORE: {p['risk_score']}")
            print("-" * 20)
        return

    print("\nRunning Algorithmic Optimization (Safe vs Risk)...")
    
    # Debugging the squad size
    valid_players = [p for p in enriched_players if get_prob_value(p) >= 50 and p["status"] != "injured"]
    print(f"DEBUG: {len(valid_players)} players meet the 50% probability threshold.")
    
    pos_counts = {"GK": 0, "DF": 0, "MF": 0, "FW": 0}
    for p in valid_players:
        for pos in p["all_pos_names"]:
            if pos in pos_counts: pos_counts[pos] += 1
    print(f"DEBUG: Counts by available role: {pos_counts}")

    safe_lineup, safe_form = optimizer.solve(enriched_players, strategy="safe")
    risk_lineup, risk_form = optimizer.solve(enriched_players, strategy="risk")
    
    if not safe_lineup:
        print("\nERROR: Could not find a valid lineup.")
        print("Reason: You likely have too few players in a specific position (e.g. GK or DF) with >= 50% probability.")
        print("Tip: Lower the threshold in optimizer.py if you have many injuries.")
        return

    # 3. DISPLAY RESULTS
    print("\n" + "="*50)
    print(f"OPTION 1: SAFE & CONSISTENT (Formation: {safe_form})")
    print("="*50)
    for i, p in enumerate(safe_lineup, 1):
        print(f"{i}. {p['name']} ({p['pos_name']}) - vs {p['rival_name']} | Prob: {p['ff_prob']}")
    
    print("\n" + "="*50)
    print(f"OPTION 2: RISK-LOVER & EXPLOSIVE (Formation: {risk_form})")
    print("="*50)
    for i, p in enumerate(risk_lineup, 1):
        print(f"{i}. {p['name']} ({p['pos_name']}) - vs {p['rival_name']} | Prob: {p['ff_prob']}")
    
    # 4. PLAYER RANKING (Full Squad)
    print("\n" + "="*120)
    print("PLAYER SCORECARD (Full Squad Breakdown)")
    print("="*120)
    # Header with features
    print(f"{'PLAYER':<18} | {'POS':<3} | {'SAFE':<5} | {'RISK':<5} | {'PROB':<4} | {'FORM':<4} | {'DvP':<4} | {'TRND':<4} | {'LOC':<4} | {'STATUS'}")
    print("-" * 120)
    
    all_sorted = sorted(enriched_players, key=lambda x: x["safe_score"], reverse=True)
    safe_names = [p["name"] for p in safe_lineup]
    risk_names = [p["name"] for p in risk_lineup]
    
    for p in all_sorted:
        # Calculate individual feature values for display
        # DvP bonus
        dvp_val = (6 - p.get("dvp_score", 3)) * 2
        # Form bonus (avg * 4 for safe)
        scores = [f if isinstance(f, (int, float)) else 0 for f in p.get("fitness", [])]
        avg_f = sum(scores) / len(scores) if scores else 0
        form_val = round(avg_f * 4, 1)
        # Trend and Loc
        trnd_val = 1 if p.get("price_trend", 0) > 0 else 0
        loc_val = 1 if p.get("location") == "Home" else 0
        # Prob val (prob * 0.5)
        prob_val = round(get_prob_value(p) * 0.5, 1)
        
        status = "BOTH" if p["name"] in safe_names and p["name"] in risk_names else "SAFE" if p["name"] in safe_names else "RISK" if p["name"] in risk_names else "BENCH"
        if p["status"] == "injured": status = "INJ"
        
        print(f"{p['name'][:18]:<18} | {p['pos_name']:<3} | {p['safe_score']:<5} | {p['risk_score']:<5} | {prob_val:<4} | {form_val:<4} | {dvp_val:<4} | {trnd_val:<4} | {loc_val:<4} | {status}")

    # 5. LLM ANALYSIS & CHAT
    if not args.no_chat:
        llama = LlamaHandler()
        llama.download_model()
        chat_context = optimizer.generate_chat_context(enriched_players, safe_lineup, safe_form, risk_lineup, risk_form, allow_subs=args.allow_subs)
        
        print("\n" + "="*50)
        print("LLAMA 3 EXPERT ANALYSIS")
        print("="*50)
        
        try:
            analysis_prompt = f"Here is the comparison between a SAFE strategy and a RISK-LOVER strategy:\n\n{chat_context}\n\nPlease explain why specific players were swapped in the Risk lineup. Analyze the trade-offs and recommend which one you would personally pick."
            analysis = llama.generate_lineup(analysis_prompt)
            print("\n" + analysis)
            
            chat_history = [{"role": "user", "content": analysis_prompt}, {"role": "assistant", "content": analysis}]
            while True:
                try: user_input = input("\nYou: ").strip()
                except EOFError: break
                if user_input.lower() in ["exit", "quit"]: break
                if not user_input: continue
                full_chat_prompt = ""
                for msg in chat_history:
                    full_chat_prompt += f"<|start_header_id|>{msg['role']}<|end_header_id|>\n\n{msg['content']}<|eot_id|>"
                full_chat_prompt += f"<|start_header_id|>user<|end_header_id|>\n\n{user_input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
                print("Llama 3 is thinking...")
                response = llama.llm(full_chat_prompt, max_tokens=512, stop=["<|eot_id|>"], echo=False)["choices"][0]["text"].strip()
                print(f"\nLlama 3: {response}")
                chat_history.append({"role": "user", "content": user_input})
                chat_history.append({"role": "assistant", "content": response})
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    main()
