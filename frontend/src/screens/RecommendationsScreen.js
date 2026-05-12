import { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";
import { filmKey } from "../recommendations/engine";

function ActionChip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Poster({ uri }) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = String(uri || "").trim();

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const renderFallback = () => (
    <View style={styles.posterPlaceholder}>
      <Text style={styles.posterPlaceholderEmoji}>{"\u{1F3AC}"}</Text>
    </View>
  );

  if (!imageUrl) return renderFallback();

  const isValidRemoteUri = /^https?:\/\/.+/i.test(imageUrl);
  if (!isValidRemoteUri || hasError) {
    return renderFallback();
  }

  try {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.posterImage}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  } catch {
    return renderFallback();
  }
}

function getPlatformVisual(platform) {
  const normalized = String(platform || "").toLowerCase();
  if (normalized.includes("netflix")) return "\u{1F534}";
  if (normalized.includes("prime")) return "\u{1F535}";
  if (normalized.includes("apple")) return "\u{1F34E}";
  if (normalized.includes("disney")) return "\u{1F7E1}";
  if (normalized.includes("hbo") || normalized.includes("max")) return "\u{1F7E3}";
  return "\u{1F3AC}";
}

const LOADING_MESSAGES = [
  "OMQ trie les navets...",
  "On secoue le cornet...",
  "Les plateformes passent au casting...",
  "Attrape les grains blancs, evite les jaunes.",
  "On cherche le match parfait...",
];

function buildPopcornPieces(round) {
  const slots = [
    { left: 8, bottom: 34, rotation: -12 },
    { left: 24, bottom: 94, rotation: 10 },
    { left: 42, bottom: 58, rotation: -4 },
    { left: 60, bottom: 112, rotation: 15 },
    { left: 78, bottom: 48, rotation: -10 },
    { left: 88, bottom: 96, rotation: 8 },
  ];

  return slots.map((slot, index) => {
    const isTrap = (round + index) % 4 === 0;
    return {
      id: `${round}-${index}`,
      type: isTrap ? "trap" : "popped",
      points: isTrap ? -2 : 3,
      ...slot,
    };
  });
}

function PopcornGrainVisual({ type }) {
  if (type === "trap") {
    return (
      <View style={styles.cornKernel}>
        <View style={styles.cornKernelHighlight} />
        <View style={styles.cornKernelTip} />
      </View>
    );
  }

  return (
    <View style={styles.poppedKernel}>
      <View style={[styles.popcornBlob, styles.popcornBlobTop]} />
      <View style={[styles.popcornBlob, styles.popcornBlobLeft]} />
      <View style={[styles.popcornBlob, styles.popcornBlobRight]} />
      <View style={[styles.popcornBlob, styles.popcornBlobBottom]} />
      <View style={[styles.popcornBlob, styles.popcornBlobCenter]} />
    </View>
  );
}

function PopcornLoadingGame() {
  const [score, setScore] = useState(0);
  const [pieces, setPieces] = useState(() => buildPopcornPieces(0));
  const [messageIndex, setMessageIndex] = useState(0);
  const [feedback, setFeedback] = useState("Grain blanc souffle = +3. Grain jaune = piege.");

  useEffect(() => {
    let nextRound = 1;
    const interval = setInterval(() => {
      setPieces(buildPopcornPieces(nextRound));
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
      nextRound += 1;
    }, 950);

    return () => clearInterval(interval);
  }, []);

  const handlePress = (piece) => {
    setPieces((current) => current.filter((candidate) => candidate.id !== piece.id));
    setScore((current) => Math.max(0, current + piece.points));
    setFeedback(piece.points > 0 ? "+3 points, bien attrape !" : "Oups, grain pas souffle !");
  };

  return (
    <View style={[styles.card, styles.loadingGameCard]}>
      <View style={styles.loadingHeader}>
        <View>
          <Text style={styles.loadingTitle}>OMQ cherche les meilleures solutions</Text>
          <Text style={styles.loadingHint}>{LOADING_MESSAGES[messageIndex]}</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.popcornStage}>
        <Text style={styles.popcornBowl}>{"\u{1F37F}"}</Text>
        {pieces.map((piece) => (
          <Pressable
            key={piece.id}
            onPress={() => handlePress(piece)}
            accessibilityRole="button"
            accessibilityLabel={piece.type === "trap" ? "Grain de mais piege" : "Grain de popcorn souffle"}
            style={[
              styles.popcornPiece,
              {
                left: `${piece.left}%`,
                bottom: piece.bottom,
                transform: [{ rotate: `${piece.rotation}deg` }],
              },
              piece.type === "trap" && styles.trapPiece,
            ]}
          >
            <PopcornGrainVisual type={piece.type} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.loadingFeedback}>{feedback}</Text>
    </View>
  );
}

export default function RecommendationsScreen({
  items = [],
  loading = false,
  error = "",
  notice = "",
  selectedPlatforms = [],
  onBack = () => {},
  onRestartQuiz = () => {},
  onSurprise = () => {},
  onOpenFavorites = () => {},
  likedMap = {},
  dislikedMap = {},
  seenMap = {},
  favoriteMap = {},
  onToggleLike = () => {},
  onToggleDislike = () => {},
  onToggleSeen = () => {},
  onToggleFavorite = () => {},
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const displayItems = safeItems.slice(0, 5);
  const platformLabels = Array.isArray(selectedPlatforms)
    ? selectedPlatforms.map((platform) => String(platform || "").trim()).filter(Boolean)
    : [];
  const getDisplayPlatform = (item, index) => {
    const itemPlatform = String(item?.raw?.platform || item?.platform || "").trim();
    if (itemPlatform) return itemPlatform;
    return platformLabels[index % Math.max(1, platformLabels.length)] || "";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Recommandations</Text>
        <Text style={styles.subtitle}>Top choix bases sur tes reponses quiz.</Text>

        <View style={styles.topActions}>
          <AppButton title="Retour accueil" onPress={onBack} variant="secondary" />
          <AppButton title="Mes favoris" onPress={onOpenFavorites} variant="secondary" />
          <AppButton title={"Surprends-moi \u{1F3B2}"} onPress={onSurprise} />
        </View>

        {!!notice && !loading && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {loading ? (
          <PopcornLoadingGame />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <AppButton title="Refaire le questionnaire" onPress={onRestartQuiz} />
          </View>
        ) : displayItems.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.value}>
              OMQ a fouille sous tous les coussins du canape, mais rien ne matche vraiment.
            </Text>
            <Text style={styles.value}>
              Refaire le questionnaire avec un peu plus de marge devrait sauver la soiree.
            </Text>
            <AppButton title="Refaire le questionnaire" onPress={onRestartQuiz} />
          </View>
        ) : (
          displayItems.map((item, index) => {
            const safeItem = item || {};
            const computedKey = String(filmKey(safeItem));
            const key = computedKey || String(safeItem.key || safeItem.id || `rec-${index}`);
            const displayPlatform = getDisplayPlatform(safeItem, index);
            return (
              <View key={key} style={styles.card}>
                <View style={styles.row}>
                  <Poster uri={safeItem.posterUri} />
                  <View style={styles.metaBlock}>
                    <Text style={styles.filmTitle}>{safeItem.title || "Titre inconnu"}</Text>
                    <Text style={styles.value}>
                      {safeItem.year || "Annee inconnue"} -{" "}
                      {safeItem.genre || "Genre non precise"}
                    </Text>
                    <View style={styles.matchRow}>
                      <Text style={styles.match}>Match {safeItem.score || 0}%</Text>
                      {!!displayPlatform && (
                        <Text style={styles.platformInline}>
                          {getPlatformVisual(displayPlatform)} Plateforme : {displayPlatform}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Resume</Text>
                  <Text style={styles.summaryText} numberOfLines={3} ellipsizeMode="tail">
                    {safeItem.summary || "Resume indisponible pour ce titre."}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Pourquoi ce match ?</Text>
                  <Text style={styles.why}>
                    {safeItem.why || "Alternative coherente selon vos choix du quiz."}
                  </Text>
                </View>
                <View style={styles.chipsRow}>
                  <ActionChip
                    label={"\u{1F44D}"}
                    active={Boolean(likedMap[key])}
                    onPress={() => onToggleLike(safeItem)}
                  />
                  <ActionChip
                    label={"\u{1F44E}"}
                    active={Boolean(dislikedMap[key])}
                    onPress={() => onToggleDislike(safeItem)}
                  />
                  <ActionChip
                    label={"\u{1F441}\uFE0F Deja vu"}
                    active={Boolean(seenMap[key])}
                    onPress={() => onToggleSeen(safeItem)}
                  />
                  <ActionChip
                    label={"\u2B50 Favori"}
                    active={Boolean(favoriteMap[key])}
                    onPress={() => onToggleFavorite(safeItem)}
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: -6,
  },
  topActions: {
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  loading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  loadingGameCard: {
    overflow: "hidden",
  },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  loadingTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  loadingHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  scorePill: {
    minWidth: 72,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#3A0B10",
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scoreValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  popcornStage: {
    height: 168,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3A1A20",
    backgroundColor: "#100D12",
    overflow: "hidden",
    position: "relative",
  },
  popcornBowl: {
    position: "absolute",
    bottom: -4,
    left: "39%",
    fontSize: 64,
  },
  popcornPiece: {
    position: "absolute",
    width: 40,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  trapPiece: {
    width: 32,
    height: 40,
    borderRadius: 16,
    shadowOpacity: 0.08,
  },
  poppedKernel: {
    width: 38,
    height: 34,
    position: "relative",
  },
  popcornBlob: {
    position: "absolute",
    backgroundColor: "#FFFDF2",
    borderColor: "#E8E2D2",
    borderWidth: 1,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.28,
    shadowRadius: 3,
  },
  popcornBlobTop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    top: 0,
    left: 10,
  },
  popcornBlobLeft: {
    width: 18,
    height: 20,
    borderRadius: 10,
    top: 10,
    left: 0,
  },
  popcornBlobRight: {
    width: 19,
    height: 21,
    borderRadius: 10,
    top: 9,
    right: 0,
  },
  popcornBlobBottom: {
    width: 18,
    height: 17,
    borderRadius: 9,
    bottom: 0,
    left: 10,
  },
  popcornBlobCenter: {
    width: 19,
    height: 20,
    borderRadius: 10,
    top: 8,
    left: 9,
    backgroundColor: "#F7F2E5",
  },
  cornKernel: {
    width: 23,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#E9B72E",
    borderColor: "#B47A13",
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cornKernelHighlight: {
    position: "absolute",
    width: 8,
    height: 20,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.28)",
    top: 6,
    left: 8,
    transform: [{ rotate: "12deg" }],
  },
  cornKernelTip: {
    position: "absolute",
    width: 7,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#8A5A12",
    bottom: -1,
    left: 8,
  },
  loadingFeedback: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  error: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  noticeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#151518",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  value: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  posterImage: {
    width: 88,
    height: 128,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
  },
  posterPlaceholder: {
    width: 88,
    height: 128,
    borderRadius: 10,
    backgroundColor: "#1B1B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  posterPlaceholderEmoji: {
    fontSize: 28,
  },
  metaBlock: {
    flex: 1,
    gap: 6,
  },
  filmTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  match: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  platformInline: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#3A0B10",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2F",
    backgroundColor: "#121216",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  why: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#1A1A1A",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#2C0C0F",
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: COLORS.text,
  },
});
