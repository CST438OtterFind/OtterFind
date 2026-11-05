
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

type Props = {
  onBack?: () => void;
};

export default function ReportItemScreen({ onBack }: Props) {
  const [reportType, setReportType] = useState<"Lost" | "Found">("Lost");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const submitReport = () => {
    if (!name.trim() || !description.trim() || !location.trim()) {
      setMessage("Please fill in all fields.");
      return;
    }

    setMessage(`${reportType} item report submitted (demo only).`);
    setName("");
    setDescription("");
    setLocation("");
    setReportType("Lost");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Report an Item</Text>

      <Text style={styles.label}>Report Type</Text>

      <View style={styles.row}>
        {(["Lost", "Found"] as const).map((type) => (
          <Pressable
            key={type}
            style={[
              styles.typeButton,
              reportType === type && styles.selected,
            ]}
            onPress={() => {
              setReportType(type);
              setMessage("");
            }}
          >
            <Text
              style={[
                styles.typeText,
                reportType === type && styles.selectedText,
              ]}
            >
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Item Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Blue Water Bottle"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.description]}
        placeholder="Describe the item..."
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: CSUMB Library"
        value={location}
        onChangeText={setLocation}
      />

      <Pressable
        style={styles.submitButton}
        onPress={submitReport}
      >
        <Text style={styles.submitText}>Submit Report</Text>
      </Pressable>

      {message !== "" && (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      )}

      {onBack && (
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#112E51",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#112E51",
    marginTop: 15,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  typeButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#112E51",
    borderRadius: 8,
    alignItems: "center",
  },
  selected: {
    backgroundColor: "#112E51",
  },
  typeText: {
    color: "#112E51",
    fontWeight: "bold",
  },
  selectedText: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  description: {
    height: 110,
  },
  submitButton: {
    backgroundColor: "#112E51",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  message: {
    color: "#112E51",
    fontSize: 15,
    marginTop: 16,
    textAlign: "center",
  },
  backButton: {
    alignItems: "center",
    padding: 15,
    marginTop: 12,
  },
  backText: {
    color: "#112E51",
    fontWeight: "bold",
  },
});
