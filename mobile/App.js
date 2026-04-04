import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Image, TouchableOpacity } from 'react-native';
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
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: '#1a5c1a', secondary: '#fbc02d' } };

let SAVED_AUTH = null;
const AppContext = createContext();
const useApp = () => useContext(AppContext);

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
                    <View style={[styles.customBadge, { backgroundColor: probInt >= 80 ? '#e8f5e9' : (probInt < 50 ? '#ffebee' : '#f5f5f5') }]}>
                        <Text style={[styles.smallProbText, { fontSize: 11 + fontSize, color: probInt >= 80 ? '#2e7d32' : (probInt < 50 ? '#d32f2f' : '#666') }]}>{player.ff_prob}</Text>
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
        if (auth) { SAVED_AUTH = auth; navigation.replace('Dashboard', { auth }); }
        else alert(t('login_failed'));
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.loginContainer}>
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
  const auth = route.params?.auth || SAVED_AUTH;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('safe');
  const { t, lang, setLang, fontSize, setFontSize } = useApp();
  const [menuVisible, setMenuVisible] = useState(false);

  const runOptimization = async (force = false) => {
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
      setData({ safe, risk, ranking: [...enriched].sort((a,b) => b.safe_score - a.safe_score) });
    } catch (err) { alert(t('network_error')); }
    finally { setLoading(false); }
  };

  useEffect(() => { runOptimization(); }, []);

  const translateMatchup = (l) => {
      const map = { 'Extreme': 'extreme', 'Hard': 'hard', 'Moderate': 'moderate', 'Easy': 'easy', 'Very Easy': 'very_easy' };
      return t(map[l] || l.toLowerCase());
  };

  const renderContent = () => {
    if (!data) return <View style={styles.center}><ActivityIndicator size="large" color="#1a5c1a" /></View>;
    if (activeTab === 'safe' || activeTab === 'risk') {
        const lineupData = activeTab === 'safe' ? data.safe : data.risk;
        const color = activeTab === 'safe' ? styles.cardHeaderSafe : styles.cardHeaderRisk;
        const icon = activeTab === 'safe' ? '🛡️' : '🔥';
        return (
            <ScrollView style={styles.tabContent}>
                <Card style={styles.lineupCard} elevation={2}>
                    <View style={color}><Text style={[styles.cardHeaderText, { fontSize: 14 + fontSize }]}>{icon} {activeTab.toUpperCase()}: {lineupData.formation}</Text></View>
                    <Card.Content>{lineupData.lineup.map((p, i) => <PlayerRow key={i} player={p} index={i} />)}</Card.Content>
                </Card>
            </ScrollView>
        );
    }

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
                                        <Text style={[styles.rowProbText, { fontSize: 13 + fontSize, color: pInt >= 80 ? '#2e7d32' : '#666' }]}>{p.ff_prob}</Text>
                                    </View>
                                    <View style={{ width: 90, alignItems: 'center' }}>
                                        <Text style={[styles.rowFormText, { fontSize: 11 + fontSize }]}>{t(p.form_label.toLowerCase())}</Text>
                                    </View>
                                    <View style={{ width: 150, alignItems: 'center', justifyContent: 'center' }}>
                                        <View style={[styles.largeMatchupBadge, { backgroundColor: p.dvp_label === 'Extreme' ? '#ffebee' : '#f5f5f5' }]}>
                                            <Text style={[styles.largeMatchupText, { fontSize: 11 + fontSize }]}>{t(p.dvp_label.toLowerCase())}</Text>
                                        </View>
                                        <Text numberOfLines={1} style={[styles.rowRivalSub, { fontSize: 9 + fontSize }]}>
                                            {t('vs')} {p.rival_name}
                                        </Text>
                                    </View>
                                </View>
                            );})}
                        </ScrollView>
                    </View>
                </ScrollView>
            </Card>
        </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f4f7f4'}}>
      <Appbar.Header elevated style={{backgroundColor: '#fff'}}>
        <Appbar.Content title={t('dashboard_title')} titleStyle={{fontSize: 16 + fontSize, fontWeight: 'bold'}} />
        <Appbar.Action icon="minus-circle-outline" onPress={() => setFontSize(Math.max(-2, fontSize - 1))} />
        <Appbar.Action icon="plus-circle-outline" onPress={() => setFontSize(Math.min(6, fontSize + 1))} />
        <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={<Appbar.Action icon="translate" onPress={() => setMenuVisible(true)} />}>
          <Menu.Item onPress={() => { setLang('es'); setMenuVisible(false); }} title="Español" />
          <Menu.Item onPress={() => { setLang('en'); setMenuVisible(false); }} title="English" />
        </Menu>
        <Appbar.Action icon="refresh" onPress={() => runOptimization(true)} />
      </Appbar.Header>

      <View style={{flex: 1}}>{loading ? <View style={styles.center}><ActivityIndicator size="large" color="#1a5c1a" /></View> : renderContent()}</View>

      <View style={styles.customTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('safe')}>
            <Text style={[styles.tabEmoji, activeTab === 'safe' ? styles.activeTab : {}]}>🛡️</Text>
            <Text style={[styles.tabLabel, activeTab === 'safe' ? styles.activeLabel : {}]}>{t('safe_lineup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('risk')}>
            <Text style={[styles.tabEmoji, activeTab === 'risk' ? styles.activeTab : {}]}>🔥</Text>
            <Text style={[styles.tabLabel, activeTab === 'risk' ? styles.activeLabel : {}]}>{t('risk_lineup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('scorecard')}>
            <Text style={[styles.tabEmoji, activeTab === 'scorecard' ? styles.activeTab : {}]}>📊</Text>
            <Text style={[styles.tabLabel, activeTab === 'scorecard' ? styles.activeLabel : {}]}>Stats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [lang, setLang] = useState('es');
  const [fontSize, setFontSize] = useState(0);
  const t = (key) => translations[lang][key] || key;
  return (
    <SafeAreaProvider>
        <AppContext.Provider value={{ lang, setLang, fontSize, setFontSize, t }}>
            <PaperProvider theme={theme}>
                <NavigationContainer>
                    <Stack.Navigator initialRouteName={SAVED_AUTH ? 'Dashboard' : 'Login'} screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Dashboard" component={Dashboard} initialParams={{ auth: SAVED_AUTH }} />
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
  loginTitle: { textAlign: 'center', fontWeight: 'bold', color: '#1a5c1a' },
  divider: { marginVertical: 15, height: 1, backgroundColor: '#eee' },
  input: { marginBottom: 15 },
  loginButton: { marginTop: 10, borderRadius: 12, backgroundColor: '#1a5c1a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  tabContent: { flex: 1, backgroundColor: '#f4f7f4' },
  lineupCard: { margin: 15, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  cardHeaderSafe: { backgroundColor: '#e8f5e9', padding: 12, borderBottomWidth: 1, borderBottomColor: '#c8e6c9' },
  cardHeaderRisk: { backgroundColor: '#fff1f0', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ffccc7' },
  cardHeaderText: { fontWeight: '800', color: '#333' },
  listItem: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  listTitle: { fontWeight: '700' },
  posContainer: { width: 35, height: 35, justifyContent: 'center', alignItems: 'center' },
  posBadge: { fontWeight: '900', color: '#1a5c1a' },
  rowRight: { justifyContent: 'center', alignItems: 'center' },
  customBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 48, alignItems: 'center' },
  smallProbText: { fontWeight: '900' },
  tableCard: { flex: 1, margin: 15, borderRadius: 16, backgroundColor: '#fff', padding: 10 },
  customTableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#f0f0f0', paddingBottom: 12 },
  customHeaderCell: { fontWeight: '900', color: '#bbb' },
  customTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f7f7f7' },
  rowPlayerName: { fontWeight: '700', color: '#333' },
  rowPlayerPos: { color: '#999', fontWeight: 'bold' },
  rowProbText: { fontWeight: '900' },
  rowFormText: { color: '#555', fontWeight: '700' },
  rowRivalSub: { color: '#888', fontWeight: '600', marginTop: 2 },
  largeMatchupBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, minWidth: 80, alignItems: 'center' },
  largeMatchupText: { fontWeight: '900', fontSize: 11 },
  customTabBar: { flexDirection: 'row', height: 75, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabEmoji: { fontSize: 24, opacity: 0.4 },
  tabLabel: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  activeTab: { opacity: 1 },
  activeLabel: { color: '#1a5c1a' }
});
