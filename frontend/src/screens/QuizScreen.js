import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AppButton from "../components/AppButton";
import { COLORS } from "../theme";

const QUIZ_STEPS = [
  {
    key: "genre",
    type: "choice",
    question: "Quel genre ?",
    hint: "Base TMDB (genres officiels).",
    options: [
      { value: "28", label: "Action", emoji: "\u{1F4A5}" },
      { value: "12", label: "Adventure", emoji: "\u{1F30D}" },
      { value: "16", label: "Animation", emoji: "\u{1F3A8}" },
      { value: "35", label: "Comedy", emoji: "\u{1F602}" },
      { value: "99", label: "Documentary", emoji: "\u{1F4F9}" },
      { value: "18", label: "Drama", emoji: "\u{1F3AD}" },
      { value: "10751", label: "Family", emoji: "\u{1F46A}" },
      { value: "27", label: "Horror", emoji: "\u{1F47B}" },
      { value: "10402", label: "Music", emoji: "\u{1F3B5}" },
      { value: "10749", label: "Romance", emoji: "\u2764\uFE0F" },
      { value: "878", label: "Science Fiction", emoji: "\u{1F680}" },
      { value: "37", label: "Western", emoji: "\u{1F920}" },
    ],
  },
  {
    key: "contentType",
    type: "choice",
    question: "Tu veux quoi ce soir ?",
    hint: "On fait simple et efficace.",
    options: [
      { value: "film", label: "Film", emoji: "\u{1F3AC}" },
      { value: "serie", label: "Serie", emoji: "\u{1F4FA}" },
      { value: "peu-importe", label: "Peu importe", emoji: "\u{1F37F}" },
    ],
  },
  {
    key: "origin",
    type: "choice",
    question: "Origine preferee ?",
    hint: "On voyage sans passeport.",
    options: [
      { value: "us", label: "US", emoji: "\u{1F1FA}\u{1F1F8}" },
      { value: "asie", label: "Film asiatique", emoji: "\u{1F30F}" },
      { value: "europe", label: "Europe", emoji: "\u{1F1EA}\u{1F1FA}" },
      { value: "peu-importe", label: "Peu importe", emoji: "\u{1F30D}" },
    ],
  },
];

const GLOBAL_STEPS = [
  {
    key: "platforms",
    type: "multi",
    question: "Quelles plateformes ?",
    hint: "Selection multiple possible.",
    options: [
      { value: "netflix", label: "Netflix", emoji: "\u{1F534}" },
      { value: "prime-video", label: "Prime Video", emoji: "\u{1F535}" },
      { value: "apple-tv", label: "Apple TV", emoji: "\u{1F34E}" },
      { value: "disney-plus", label: "Disney+", emoji: "\u{1F7E1}" },
      { value: "hbo-max", label: "HBO", emoji: "\u{1F7E3}" },
    ],
  },
  {
    key: "ageRestriction",
    type: "choice",
    question: "Quel age pour la soiree ?",
    hint: "On filtre bien pour eviter les mauvaises surprises.",
    options: [
      { value: "all", label: "Tout public", emoji: "\u{1F46A}" },
      { value: "12", label: "Interdit aux moins de 12 ans", emoji: "\u{1F6AB}" },
      { value: "16", label: "Interdit aux moins de 16 ans", emoji: "\u{1F6D1}" },
      { value: "18", label: "Interdit aux moins de 18 ans", emoji: "\u26D4" },
    ],
  },
];

const INITIAL_ANSWERS = {
  firstName: "",
  genre: "",
  contentType: "",
  origin: "",
};

const INITIAL_GLOBAL_ANSWERS = {
  ageRestriction: "",
  platform: "",
  platforms: [],
};

function buildUsers(count) {
  return Array.from({ length: count }, () => ({ ...INITIAL_ANSWERS }));
}

function AnswerCard({ option, selected, onPress }) {
  return (
    <View style={[styles.answerCard, selected && styles.answerCardSelected]}>
      <AppButton
        title={`${option.emoji}  ${option.label}`}
        onPress={onPress}
        variant={selected ? "primary" : "secondary"}
      />
    </View>
  );
}

function SummaryItem({ label, value }) {
  const displayValue = String(value || "-")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{displayValue}</Text>
    </View>
  );
}

export default function QuizScreen({ onBack, onComplete }) {
  const [stage, setStage] = useState("participants");
  const [participantCount, setParticipantCount] = useState(1);
  const [globalAnswers, setGlobalAnswers] = useState({ ...INITIAL_GLOBAL_ANSWERS });
  const [globalStepIndex, setGlobalStepIndex] = useState(0);
  const [usersAnswers, setUsersAnswers] = useState(buildUsers(1));
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const step = QUIZ_STEPS[stepIndex];
  const globalStep = GLOBAL_STEPS[globalStepIndex];
  const totalSteps = QUIZ_STEPS.length;
  const currentAnswers = usersAnswers[currentUserIndex] || INITIAL_ANSWERS;

  const canContinue = useMemo(() => {
    if (stage === "global" && globalStep) {
      const value = globalAnswers[globalStep.key];
      if (globalStep.type === "multi") {
        return Array.isArray(value) && value.length > 0;
      }
      return Boolean(value);
    }
    if (stage === "identify") {
      return Boolean(String(currentAnswers?.firstName || "").trim());
    }
    if (stage !== "quiz" || !step) return false;
    const value = currentAnswers[step.key];
    if (step.type === "input") return Boolean(String(value || "").trim());
    return Boolean(value);
  }, [currentAnswers, globalAnswers, globalStep, stage, step, usersAnswers]);

  function setCount(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(1, Math.min(6, parsed));
    setParticipantCount(clamped);
  }

  function startQuizForAllUsers() {
    const count = Math.max(1, Math.min(6, Number(participantCount) || 1));
    const freshUsers = buildUsers(count);
    setParticipantCount(count);
    setGlobalAnswers({ ...INITIAL_GLOBAL_ANSWERS });
    setGlobalStepIndex(0);
    setUsersAnswers(freshUsers);
    setCurrentUserIndex(0);
    setStepIndex(0);
    setStage("global");
    console.log("[QUIZ] nombre d'utilisateurs:", count);
  }

  function updateUserName(index, value) {
    setUsersAnswers((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] || INITIAL_ANSWERS), firstName: value };
      return next;
    });
  }

  function updateCurrentAnswer(key, value) {
    setUsersAnswers((prev) => {
      const next = [...prev];
      next[currentUserIndex] = { ...(next[currentUserIndex] || INITIAL_ANSWERS), [key]: value };
      return next;
    });
  }

  function updateGlobalAnswer(key, value) {
    setGlobalAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGlobalMultiAnswer(key, value) {
    setGlobalAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      const nextValues = exists
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      return {
        ...prev,
        [key]: nextValues,
        platform: key === "platforms" ? nextValues[0] || "" : prev.platform,
      };
    });
  }

  function handleContinue() {
    if (stage === "identify") {
      if (!canContinue) return;
      setStepIndex(0);
      setStage("quiz");
      return;
    }

    if (stage === "global") {
      if (!canContinue) return;
      if (globalStepIndex < GLOBAL_STEPS.length - 1) {
        setGlobalStepIndex((prev) => prev + 1);
        return;
      }
      setStage("identify");
      setCurrentUserIndex(0);
      setStepIndex(0);
      return;
    }

    if (!canContinue || stage !== "quiz") return;

    if (stepIndex < totalSteps - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }

    const completedAnswers = usersAnswers[currentUserIndex] || INITIAL_ANSWERS;
    console.log("[QUIZ] reponses utilisateur completees:", {
      user: currentUserIndex + 1,
      answers: completedAnswers,
    });

    if (currentUserIndex < participantCount - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setStepIndex(0);
      setStage("identify");
      return;
    }

    console.log("[QUIZ] reponses stockees pour tous les utilisateurs:", usersAnswers);
    setStage("summary");
  }

  function handleBack() {
    if (stage === "participants") {
      onBack?.();
      return;
    }

    if (stage === "global") {
      if (globalStepIndex > 0) {
        setGlobalStepIndex((prev) => prev - 1);
        return;
      }
      setStage("participants");
      return;
    }

    if (stage === "identify") {
      if (currentUserIndex > 0) {
        setCurrentUserIndex((prev) => prev - 1);
        setStepIndex(totalSteps - 1);
        setStage("quiz");
        return;
      }
      setStage("global");
      setGlobalStepIndex(GLOBAL_STEPS.length - 1);
      return;
    }

    if (stage === "summary") {
      setStage("quiz");
      setCurrentUserIndex(Math.max(0, participantCount - 1));
      setStepIndex(totalSteps - 1);
      return;
    }

    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      return;
    }

    setStage("identify");
  }

  function handleRestart() {
    setStage("participants");
    setParticipantCount(1);
    setGlobalAnswers({ ...INITIAL_GLOBAL_ANSWERS });
    setGlobalStepIndex(0);
    setUsersAnswers(buildUsers(1));
    setCurrentUserIndex(0);
    setStepIndex(0);
  }

  function handleOpenRecommendations() {
    const normalizedUsers = usersAnswers.map((user, index) => ({
      ...user,
      firstName: String(user?.firstName || "").trim() || `Utilisateur ${index + 1}`,
      name: String(user?.firstName || "").trim() || `Utilisateur ${index + 1}`,
      type: user?.contentType || "",
      country: user?.origin || "",
    }));
    const payload = {
      participantCount,
      globalAnswers,
      users: normalizedUsers,
    };
    console.log("[QUIZ] appel fonction recommandation:", payload);
    onComplete?.(payload);
  }

  const ageOptions = GLOBAL_STEPS.find((entry) => entry.key === "ageRestriction")?.options || [];
  const platformOptions = GLOBAL_STEPS.find((entry) => entry.key === "platforms")?.options || [];
  const ageLabel =
    ageOptions.find((option) => option.value === globalAnswers.ageRestriction)?.label || "-";
  const genreOptions = QUIZ_STEPS.find((entry) => entry.key === "genre")?.options || [];
  const getGenreLabel = (value) =>
    genreOptions.find((option) => option.value === value)?.label || value || "-";
  const platformLabel =
    (Array.isArray(globalAnswers.platforms) && globalAnswers.platforms.length > 0
      ? platformOptions
          .filter((option) => globalAnswers.platforms.includes(option.value))
          .map((option) => option.label)
          .join(", ")
      : "-");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Quiz</Text>
        <Text style={styles.subtitle}>Une question par ecran, tranquillement.</Text>

        <AppButton title="Retour" onPress={handleBack} variant="secondary" />

        {stage === "participants" && (
          <View style={styles.card}>
            <Text style={styles.question}>Combien de personnes participent ?</Text>
            <Text style={styles.hint}>Entre 1 et 6 personnes.</Text>

            <TextInput
              style={styles.input}
              value={String(participantCount)}
              onChangeText={setCount}
              keyboardType="number-pad"
              maxLength={1}
              placeholder="1"
              placeholderTextColor="#888888"
            />

            <View style={styles.answersList}>
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <AnswerCard
                  key={String(count)}
                  option={{ value: count, label: `${count} personne${count > 1 ? "s" : ""}`, emoji: "\u{1F465}" }}
                  selected={participantCount === count}
                  onPress={() => setParticipantCount(count)}
                />
              ))}
            </View>

            <AppButton title="Commencer le quiz" onPress={startQuizForAllUsers} />
          </View>
        )}

        {stage === "identify" && (
          <View style={styles.card}>
            <Text style={styles.progress}>
              Utilisateur {currentUserIndex + 1}/{participantCount}
            </Text>
            <Text style={styles.question}>Quel est ton prenom ?</Text>
            <Text style={styles.hint}>
              Ton nom ou surnom permettra d'expliquer clairement pourquoi ca matche pour toi.
            </Text>

            <View style={styles.identityBlock}>
              <Text style={styles.identityLabel}>Participant {currentUserIndex + 1}</Text>
              <TextInput
                style={styles.input}
                value={currentAnswers.firstName || ""}
                onChangeText={(value) => updateUserName(currentUserIndex, value)}
                placeholder={`Prenom ou surnom ${currentUserIndex + 1}`}
                placeholderTextColor="#888888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <AppButton title="Passer a son quiz" onPress={handleContinue} disabled={!canContinue} />
          </View>
        )}

        {stage === "global" && (
          <View style={styles.card}>
            <Text style={styles.progress}>
              Etape globale {globalStepIndex + 1}/{GLOBAL_STEPS.length}
            </Text>
            <Text style={styles.question}>{globalStep.question}</Text>
            <Text style={styles.hint}>{globalStep.hint}</Text>

            <View style={styles.answersList}>
              {globalStep.options.map((option) => (
                <AnswerCard
                  key={option.value}
                  option={option}
                  selected={
                    globalStep.type === "multi"
                      ? Array.isArray(globalAnswers[globalStep.key]) &&
                        globalAnswers[globalStep.key].includes(option.value)
                      : globalAnswers[globalStep.key] === option.value
                  }
                  onPress={() =>
                    globalStep.type === "multi"
                      ? toggleGlobalMultiAnswer(globalStep.key, option.value)
                      : updateGlobalAnswer(globalStep.key, option.value)
                  }
                />
              ))}
            </View>

            <AppButton title="Continuer" onPress={handleContinue} disabled={!canContinue} />
          </View>
        )}

        {stage === "quiz" && (
          <View style={styles.card}>
            <Text style={styles.progress}>
              {(currentAnswers.firstName || `Utilisateur ${currentUserIndex + 1}`)} - Question {stepIndex + 1}/{totalSteps}
            </Text>
            <Text style={styles.question}>{step.question}</Text>
            <Text style={styles.hint}>{step.hint}</Text>

            {step.type === "input" ? (
              <TextInput
                style={styles.input}
                value={currentAnswers[step.key]}
                onChangeText={(value) => updateCurrentAnswer(step.key, value)}
                placeholder={step.placeholder}
                placeholderTextColor="#888888"
                autoCapitalize="words"
                autoCorrect={false}
              />
            ) : (
              <View style={styles.answersList}>
                {step.options.map((option) => (
                  <AnswerCard
                    key={option.value}
                    option={option}
                    selected={currentAnswers[step.key] === option.value}
                    onPress={() => updateCurrentAnswer(step.key, option.value)}
                  />
                ))}
              </View>
            )}

            <AppButton title="Continuer" onPress={handleContinue} disabled={!canContinue} />
          </View>
        )}

        {stage === "summary" && (
          <View style={styles.card}>
            <Text style={styles.question}>Resume des reponses</Text>
            <Text style={styles.hint}>
              Parfait, tous les utilisateurs ont complete le quiz.
            </Text>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>
                {participantCount} participant{participantCount > 1 ? "s" : ""} pret{participantCount > 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.userSummaryBlock}>
              <Text style={styles.userSummaryTitle}>Parametres globaux</Text>
              <SummaryItem label="Age" value={ageLabel} />
              <SummaryItem label="Plateforme" value={platformLabel} />
            </View>

            {usersAnswers.map((answers, index) => (
              <View key={`user-${index + 1}`} style={styles.userSummaryBlock}>
                <Text style={styles.userSummaryTitle}>
                  {answers.firstName || `Utilisateur ${index + 1}`}
                </Text>
                <SummaryItem label="Type" value={answers.contentType} />
                <SummaryItem label="Genre" value={getGenreLabel(answers.genre)} />
                <SummaryItem label="Origine" value={answers.origin} />
              </View>
            ))}

            <View style={styles.summaryActions}>
              <AppButton title="Voir recommandations" onPress={handleOpenRecommendations} />
              <AppButton title="Recommencer" onPress={handleRestart} />
              <AppButton title="Retour accueil" onPress={onBack} variant="secondary" />
            </View>
          </View>
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
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  progress: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  question: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#1D1D1D",
    borderRadius: 12,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  answersList: {
    gap: 10,
  },
  answerCard: {
    borderRadius: 14,
  },
  answerCardSelected: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  identityBlock: {
    gap: 8,
  },
  identityLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  userSummaryBlock: {
    backgroundColor: "#101013",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2F",
    padding: 12,
    gap: 8,
  },
  userSummaryTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryItem: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#27272D",
    backgroundColor: "#17171B",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#3A0B10",
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
    maxWidth: "64%",
    textAlign: "right",
  },
  summaryActions: {
    marginTop: 8,
    gap: 10,
  },
  summaryBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#3A0B10",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
