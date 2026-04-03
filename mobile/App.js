import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Image } from 'react-native';
import { 
  Provider as PaperProvider, 
  TextInput, 
  Button, 
  Card, 
  Title, 
  ActivityIndicator,
  Appbar,
  Text,
  Chip,
  Divider,
  List,
  Menu,
  BottomNavigation,
  MD3LightTheme as DefaultTheme
} from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BiwengerClient from './src/logic/BiwengerClient';
import FutbolFantasyScraper from './src/logic/FFScraper';
import LineupOptimizer from './src/logic/Optimizer';
import { translations } from './src/logic/Translations';

const Stack = createStackNavigator();
const theme = { 
    ...DefaultTheme, 
    colors: { 
        ...DefaultTheme.colors, 
        primary: '#1a5c1a', 
        secondary: '#fbc02d',
        surface: '#ffffff',
        outline: '#e0e0e0'
    } 
};

// --- SESSION PERSISTENCE (Survives Fast Refresh) ---
let GLOBAL_SESSION = null;

const AppContext = createContext();
const useApp = () => useContext(AppContext);

const DASHBOARD_ROUTES = [
  { key: 'safe', title: 'Safe', icon: 'shield-check' },
  { key: 'risk', title: 'Risk', icon: 'fire' },
  { key: 'scorecard', title: 'Stats', icon: 'table-large' },
];

// --- COMPONENTS ---

const PlayerRow = ({ player, index }) => {
    const { t, fontSize } = useApp();
    const loc = player.location === 'Home' ? t('home') : t('away');
    const probInt = parseInt(String(player.ff_prob || "0").replace("%", ""));
    return (
        <List.Item
            title={`${index + 1}. ${player.name}`}
            titleStyle={[styles.listTitle, { fontSize: 14 + fontSize }]}
            description={`${t('vs')} ${player.rival_name} (${loc})`}
            descriptionStyle={{ fontSize: 12 + fontSize }}
            left={props => (
                <View style={styles.posContainer}>
                    <Text style={[styles.posBadge, { fontSize: 11 + fontSize }]}>{player.pos_name}</Text>
                </View>
            )}
            right={props => (
                <View style={styles.rowRight}>
                    <View style={[
                        styles.customBadge, 
                        { backgroundColor: probInt >= 80 ? '#e8f5e9' : (probInt < 50 ? '#ffebee' : '#f5f5f5') }
                    ]}>
                        <Text style={[
                            styles.smallProbText, 
                            { fontSize: 11 + fontSize, color: probInt >= 80 ? '#2e7d32' : (probInt < 50 ? '#d32f2f' : '#666') }
                        ]}>
                            {player.ff_prob}
                        </Text>
                    </View>
                </View>
            )}
            style={styles.listItem}
        />
    );
};

// --- SCREENS ---

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, fontSize } = useApp();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
        const client = new BiwengerClient();
        const auth = await client.login(email, password);
        if (auth) {
            GLOBAL_SESSION = auth; // Save to global
            navigation.replace('Dashboard', { auth }); // Use replace so login isn't in history
        } else {
            alert(t('login_failed'));
        }
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="light-content" />
      <Card style={styles.loginCard} elevation={5}>
        <Card.Content>
          <Title style={[styles.loginTitle, { fontSize: 24 + fontSize }]}>{t('login_title')}</Title>
          <Divider style={styles.divider} />
          <TextInput label={t('email')} value={email} onChangeText={setEmail} mode="outlined" autoCapitalize="none" style={styles.input} />
          <TextInput label={t('password')} value={password} onChangeText={setPassword} mode="outlined" secureTextEntry style={styles.input} />
          <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.loginButton} contentStyle={{height: 50}}>
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14 + fontSize}}>{t('sign_in')}</Text>
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

function Dashboard({ route }) {
  const auth = route.params?.auth || GLOBAL_SESSION;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const isRunning = useRef(false);
  const { t, lang, setLang, fontSize, setFontSize } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);

  const runOptimization = async (force = false) => {
    if (isRunning.current || !auth) return;
    isRunning.current = true;
    setLoading(true);
    try {
      const client = new BiwengerClient(auth.token, auth.user_id, auth.league_id);
      const players = await client.getPlayerData(force);
      const scraper = new FutbolFantasyScraper();
      const ffProbs = await scraper.getAllLineupData();
      const optimizer = new LineupOptimizer(players, ffProbs);
      const enriched = optimizer.matchPlayers();
      const safe = optimizer.solve(enriched, "safe");
      const risk = optimizer.solve(enriched, "risk");
      const ranking = [...enriched].sort((a,b) => b.safe_score - a.safe_score);
      setData({ safe, risk, ranking });
    } catch (err) {
      alert(t('network_error'));
    } finally {
      setLoading(false);
      isRunning.current = false;
    }
  };

  useEffect(() => { runOptimization(); }, []);

  const translateMatchup = (label) => {
      const map = { 'Extreme': 'extreme', 'Hard': 'hard', 'Moderate': 'moderate', 'Easy': 'easy', 'Very Easy': 'very_easy' };
      return t(map[label] || label.toLowerCase());
  };

  const translateForm = (label) => {
      const map = { 'Elite': 'elite', 'Great': 'great', 'Good': 'good', 'Fair': 'fair', 'Poor': 'poor' };
      return t(map[label] || label.toLowerCase());
  };

  const renderScene = ({ route }) => {
    if (!data) return <View style={styles.center}><ActivityIndicator color="#1a5c1a" /></View>;
    switch (route.key) {
      case 'safe':
        return (
          <ScrollView style={styles.tabContent}>
            <Card style={styles.lineupCard} elevation={2}>
              <View style={styles.cardHeaderSafe}><Text style={[styles.cardHeaderText, { fontSize: 14 + fontSize }]}>🛡️ {t('safe_lineup')}: {data.safe.formation}</Text></View>
              <Card.Content>{data.safe.lineup.map((p, i) => <PlayerRow key={i} player={p} index={i} />)}</Card.Content>
            </Card>
          </ScrollView>
        );
      case 'risk':
        return (
          <ScrollView style={styles.tabContent}>
            <Card style={styles.lineupCard} elevation={2}>
              <View style={styles.cardHeaderRisk}><Text style={[styles.cardHeaderText, { fontSize: 14 + fontSize }]}>🔥 {t('risk_lineup')}: {data.risk.formation}</Text></View>
              <Card.Content>{data.risk.lineup.map((p, i) => <PlayerRow key={i} player={p} index={i} />)}</Card.Content>
            </Card>
          </ScrollView>
        );
      case 'scorecard':
        return (
          <View style={styles.tabContent}>
            <Card style={styles.tableCard} elevation={1}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={{paddingBottom: 10}}>
                  <View style={styles.customTableHeader}>
                    <Text style={[styles.customHeaderCell, { width: 170, fontSize: 10 + fontSize }]}>{t('player')}</Text>
                    <Text style={[styles.customHeaderCell, { width: 60, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('prob')}</Text>
                    <Text style={[styles.customHeaderCell, { width: 90, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('form')}</Text>
                    <Text style={[styles.customHeaderCell, { width: 150, textAlign: 'center', fontSize: 10 + fontSize }]}>{t('matchup')}</Text>
                  </View>
                  <ScrollView>
                    {data.ranking.map((p, index) => {
                        const pInt = parseInt(String(p.ff_prob || "0").replace("%", ""));
                        return (
                      <View key={index} style={[styles.customTableRow, index % 2 === 0 ? {} : {backgroundColor: '#fafafa'}]}>
                        <View style={{ width: 170 }}>
                          <Text numberOfLines={1} style={[styles.rowPlayerName, { fontSize: 13 + fontSize }]}>{p.name}</Text>
                          <Text style={[styles.rowPlayerPos, { fontSize: 9 + fontSize }]}>{p.pos_name}</Text>
                        </View>
                        <View style={{ width: 60, alignItems: 'center' }}>
                          <Text style={[styles.rowProbText, { fontSize: 13 + fontSize, color: pInt >= 80 ? '#2e7d32' : (pInt < 50 ? '#d32f2f' : '#ef6c00') }]}>{p.ff_prob.replace('%','')}</Text>
                        </View>
                        <View style={{ width: 90, alignItems: 'center' }}>
                          <Text style={[styles.rowFormText, { fontSize: 11 + fontSize }]}>{translateForm(p.form_label)}</Text>
                          <Text style={{fontSize: 9 + fontSize, color: '#999'}}>{p.form_val} avg</Text>
                        </View>
                        <View style={{ width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={styles.rivalLogoContainer}>
                            {p.rival_id ? (
                                <Image 
                                    source={{ uri: `https://cf.biwenger.com/resources/logos/${p.rival_id}.png` }} 
                                    style={styles.rivalLogo} 
                                    key={`logo-${p.rival_id}`}
                                />
                            ) : (
                                <Text style={{fontSize: 8, color: '#ccc'}}>?</Text>
                            )}
                          </View>
                          <View style={[styles.largeMatchupBadge, { backgroundColor: p.dvp_label === 'Extreme' ? '#ffebee' : (p.dvp_label === 'Hard' ? '#fff3e0' : (p.dvp_label === 'Easy' ? '#e8f5e9' : '#f5f5f5')) }]}>
                            <Text style={[styles.largeMatchupText, { fontSize: 11 + fontSize, color: p.dvp_label === 'Extreme' ? '#c62828' : (p.dvp_label === 'Hard' ? '#ef6c00' : (p.dvp_label === 'Easy' ? '#2e7d32' : '#666')) }]}>{translateMatchup(p.dvp_label)}</Text>
                          </View>
                        </View>
                      </View>
                    );})}
                  </ScrollView>
                </View>
              </ScrollView>
            </Card>
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f4f7f4'}}>
      <Appbar.Header elevated style={{backgroundColor: '#fff'}}>
        <Appbar.Content title={t('dashboard_title')} titleStyle={[styles.appbarTitle, { fontSize: 16 + fontSize }]} />
        <Appbar.Action icon="format-size" onPress={() => setFontSize(fontSize === 0 ? 3 : 0)} iconColor={fontSize > 0 ? "#1a5c1a" : "#666"} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<Appbar.Action icon="translate" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item onPress={() => { setLang('es'); setMenuVisible(false); }} title="Español" leadingIcon={lang === 'es' ? 'check' : null} />
          <Menu.Item onPress={() => { setLang('en'); setMenuVisible(false); }} title="English" leadingIcon={lang === 'en' ? 'check' : null} />
        </Menu>
        <Appbar.Action icon="refresh" onPress={() => runOptimization(true)} disabled={loading} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a5c1a" />
          <Text style={[styles.loadingText, { fontSize: 16 + fontSize }]}>{t('processing')}</Text>
        </View>
      ) : (
        <BottomNavigation
            navigationState={{ index: tabIndex, routes: DASHBOARD_ROUTES }}
            onIndexChange={setTabIndex}
            renderScene={renderScene}
            barStyle={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' }}
            activeColor="#1a5c1a"
            inactiveColor="#999"
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const [lang, setLang] = useState('es');
  const [fontSize, setFontSize] = useState(0);
  const t = (key) => translations[lang][key] || key;
  
  // Choose initial route based on existing session
  const initialRoute = GLOBAL_SESSION ? 'Dashboard' : 'Login';

  return (
    <SafeAreaProvider>
        <AppContext.Provider value={{ lang, setLang, fontSize, setFontSize, t }}>
            <PaperProvider theme={theme}>
                <NavigationContainer>
                    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Dashboard" component={Dashboard} initialParams={{ auth: GLOBAL_SESSION }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </PaperProvider>
        </AppContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1a5c1a' },
  loginCard: { padding: 15, borderRadius: 20 },
  loginTitle: { textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: '#1a5c1a' },
  divider: { marginVertical: 15, height: 1, backgroundColor: '#eee' },
  input: { marginBottom: 15 },
  loginButton: { marginTop: 10, borderRadius: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 20, fontWeight: 'bold', color: '#1a5c1a' },
  appbarTitle: { fontWeight: '800', color: '#1a5c1a' },
  tabContent: { flex: 1, backgroundColor: '#f4f7f4' },
  lineupCard: { margin: 15, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardHeaderSafe: { backgroundColor: '#e8f5e9', padding: 12, borderBottomWidth: 1, borderBottomColor: '#c8e6c9' },
  cardHeaderRisk: { backgroundColor: '#fff1f0', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ffccc7' },
  cardHeaderText: { fontWeight: '800', color: '#333' },
  listItem: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  listTitle: { fontWeight: '700' },
  posContainer: { width: 35, height: 35, justifyContent: 'center', alignItems: 'center' },
  posBadge: { fontWeight: '900', color: '#1a5c1a' },
  rowRight: { justifyContent: 'center', alignItems: 'center', paddingRight: 5 },
  customBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  smallProbText: { fontWeight: '900' },
  tableCard: { flex: 1, margin: 15, borderRadius: 16, backgroundColor: '#fff', padding: 10 },
  customTableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#f0f0f0', paddingBottom: 12, marginBottom: 5 },
  customHeaderCell: { fontWeight: '900', color: '#bbb', letterSpacing: 1 },
  customTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f7f7f7' },
  rowPlayerName: { fontWeight: '700', color: '#333' },
  rowPlayerPos: { color: '#999', fontWeight: 'bold' },
  rowProbText: { fontWeight: '900' },
  rowFormText: { color: '#555', fontWeight: '700' },
  largeMatchupBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  largeMatchupText: { fontWeight: '900' },
  rivalLogoContainer: { width: 32, height: 32, marginRight: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  rivalLogo: { width: 24, height: 24 },
});
