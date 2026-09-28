import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { logError } from "../lib/crashReporter";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError(error, { componentStack: errorInfo.componentStack ?? undefined });
  }

  handleReset = (): void => {
    if (Platform.OS === "web") {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Κάτι πήγε στραβά</Text>
          <Text style={styles.subtitle}>Παρουσιάστηκε μη αναμενόμενο σφάλμα.</Text>
          <Text style={styles.button} onPress={this.handleReset}>
            Επανεκκίνηση
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    backgroundColor: "rgba(0,122,255,0.10)",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
});
