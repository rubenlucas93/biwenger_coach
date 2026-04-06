const fs = require('fs');
let code = fs.readFileSync('App.js', 'utf8');

// 1. Add leagueLoading state
code = code.replace("const [activeTab, setActiveTab] = useState('safe');", 
    "const [activeTab, setActiveTab] = useState('safe');\n  const [leagueLoading, setLeagueLoading] = useState(false);");

// 2. Break down runOptimization into two functions
const newOptimization = `  const runOptimization = async (force = false) => {
    setLoading(true);
    setLeagueLoading(true);
    try {
      const client = new BiwengerClient(auth.token, auth.user_id, auth.league_id);
      const players = await client.getPlayerData(force);
      const scraper = new FutbolFantasyScraper();
      const ffProbs = await scraper.getAllLineupData();
      const optimizer = new LineupOptimizer(players, ffProbs);
      const enriched = optimizer.matchPlayers();
      const safe = optimizer.solve(enriched, "safe");
      const risk = optimizer.solve(enriched, "risk");

      setData({ safe, risk, ranking: [...enriched].sort((a,b) => b.safe_score - a.safe_score), leagueBoard: [] });
      setLoading(false); // Enable UI immediately for local tabs

      // Now background fetch league board
      setTimeout(() => fetchLeagueBoard(client, ffProbs), 100);
    } catch (err) { 
      setLoading(false);
      alert(t('network_error')); 
    }
  };

  const fetchLeagueBoard = async (client, ffProbs) => {
    try {
      let leagueBoardData = [];
      const leagueBoardRaw = await client.getLeagueBoard();
      if (leagueBoardRaw && leagueBoardRaw.round && leagueBoardRaw.allPlayers) {
          const allOptimizer = new LineupOptimizer(Object.values(leagueBoardRaw.allPlayers), ffProbs);
          const enrichedAll = allOptimizer.matchPlayers();
          const enrichedMap = {};
          enrichedAll.forEach(p => enrichedMap[p.id] = p);

          const standings = leagueBoardRaw.round.standings || leagueBoardRaw.round.results || [];
          const activeGames = leagueBoardRaw.activeGames || [];
          
          leagueBoardData = standings.map(user => {
              const currentPts = user.points || 0;
              let calculatedRoundPts = 0;
              let pendingExp = 0;
              
              let lineup = [];
              if (Array.isArray(user.lineup)) lineup = user.lineup;
              else if (user.lineup && Array.isArray(user.lineup.players)) lineup = user.lineup.players;
              else if (Array.isArray(user.players)) lineup = user.players;
              
              lineup.forEach(lp => {
                  const pid = lp.id || lp;
                  const pObj = typeof lp === 'object' ? lp : {};
                  const globalPlayer = enrichedMap[pid] || leagueBoardRaw.allPlayers[pid];
                  
                  let isPending = true;
                  if (globalPlayer) {
                      const teamIdStr = String(globalPlayer.team_id || globalPlayer.teamID);
                      const game = activeGames.find(g => String(g.home?.id) === teamIdStr || String(g.away?.id) === teamIdStr);
                      if (game && game.status && game.status !== 'preview' && game.status !== 'pending' && game.status !== 'postponed') {
                          isPending = false;
                          const fitness = globalPlayer.fitness || [];
                          if (fitness.length > 0) {
                              const lastScore = fitness[fitness.length - 1];
                              if (typeof lastScore === 'number') calculatedRoundPts += lastScore;
                          }
                      }
                  }
                  if (pObj.played !== undefined) isPending = !pObj.played;
                  if (isPending && enrichedMap[pid]) pendingExp += (enrichedMap[pid].expected_pts || 0);
              });

              const roundPts = user.score || user.roundPoints || calculatedRoundPts || 0;
              return {
                  id: user.user?.id || user.id,
                  name: user.user?.name || user.name || "Unknown",
                  currentPts,
                  roundPts,
                  pendingExp: Math.round(pendingExp * 10) / 10,
                  totalExp: Math.round((currentPts + pendingExp) * 10) / 10
              };
          });
          
          leagueBoardData.sort((a, b) => b.totalExp - a.totalExp);
      }
      setData(prev => prev ? { ...prev, leagueBoard: leagueBoardData } : null);
    } catch (err) {
      console.log("League board background error", err);
    } finally {
      setLeagueLoading(false);
    }
  };`;

// Use regex to replace the old runOptimization completely
code = code.replace(/const runOptimization = async[\s\S]*?useEffect\(\(\) => \{ runOptimization\(\); \}, \[\]\);/, newOptimization + "\n\n  useEffect(() => { runOptimization(); }, []);");

// 3. Add leagueLoading spinner to the 'league' tab view
const oldLeagueView = "if (activeTab === 'league') {\n        return (";
const newLeagueView = "if (activeTab === 'league') {\n        if (leagueLoading) return <View style={styles.center}><ActivityIndicator size=\"large\" color=\"#1a5c1a\" /></View>;\n        return (";
code = code.replace(oldLeagueView, newLeagueView);

// 4. Add the new 'projection' tab view
const projCode = `    if (activeTab === 'projection') {
        const sortedProj = [...data.ranking].sort((a,b) => b.projected_pts - a.projected_pts);
        return (
            <View style={styles.tabContent}>
                <Card style={styles.tableCard} elevation={1}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{paddingBottom: 10, minWidth: 360}}>
                            <View style={styles.customTableHeader}>
                                <Text style={[styles.customHeaderCell, { width: 140, fontSize: 10 + fontSize }]}>{t('player')}</Text>
                                <Text style={[styles.customHeaderCell, { width: 70, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('current_pts')}</Text>
                                <Text style={[styles.customHeaderCell, { width: 70, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('recent_avg')}</Text>
                                <Text style={[styles.customHeaderCell, { width: 80, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('projected_pts')}</Text>
                            </View>
                            <ScrollView>
                                {sortedProj.map((p, index) => (
                                    <View key={index} style={[styles.customTableRow, index % 2 === 0 ? {} : {backgroundColor: '#fafafa'}]}>
                                        <View style={{ width: 140 }}>
                                            <Text numberOfLines={1} style={[styles.rowPlayerName, { fontSize: 13 + fontSize }]}>{index + 1}. {p.name}</Text>
                                            <Text style={[styles.rowPlayerPos, { fontSize: 9 + fontSize }]}>{p.pos_name}</Text>
                                        </View>
                                        <View style={{ width: 70, alignItems: 'center' }}>
                                            <Text style={[styles.rowProbText, { fontSize: 13 + fontSize, color: '#333' }]}>{p.current_pts}</Text>
                                        </View>
                                        <View style={{ width: 70, alignItems: 'center' }}>
                                            <Text style={[styles.rowProbText, { fontSize: 13 + fontSize, color: '#666' }]}>{p.last5_avg}</Text>
                                        </View>
                                        <View style={{ width: 80, alignItems: 'center' }}>
                                            <Text style={[styles.rowProbText, { fontSize: 14 + fontSize, color: '#1a5c1a' }]}>{p.projected_pts}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </Card>
            </View>
        );
    }
`;

code = code.replace("return (\n        <View style={styles.tabContent}>\n            <Card style={styles.tableCard} elevation={1}>\n                <ScrollView horizontal", projCode + "    return (\n        <View style={styles.tabContent}>\n            <Card style={styles.tableCard} elevation={1}>\n                <ScrollView horizontal");

// 5. Add 'projection' tab button
const projButton = `        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('projection')}>
            <Text style={[styles.tabEmoji, activeTab === 'projection' ? styles.activeTab : {}]}>🔮</Text>
            <Text style={[styles.tabLabel, activeTab === 'projection' ? styles.activeLabel : {}]}>{t('projection')}</Text>
        </TouchableOpacity>
      </View>`;

code = code.replace("</TouchableOpacity>\n      </View>", "</TouchableOpacity>\n" + projButton);

fs.writeFileSync('App.js', code);
console.log('App patched successfully');
