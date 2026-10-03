import { TextInput, View, Text, StyleSheet, Pressable } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
  disabled?: boolean;
  style?: StyleSheet.ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  multiline = false,
  numberOfLines,
  autoCapitalize = "sentences",
  keyboardType = "default",
  disabled = false,
  style,
  leftIcon,
  rightIcon,
  onBlur,
  onSubmitEditing,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        multiline && styles.inputWrapperMultiline,
      ]}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            error && styles.inputError,
            disabled && styles.inputDisabled,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          disabled={disabled}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
          placeholderTextColor="#827B8B"
        />
        {(secureTextEntry || rightIcon) && (
          <View style={styles.iconRight}>
            {secureTextEntry ? (
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPassword ? <EyeOff size={20} color="#827B8B" /> : <Eye size={20} color="#827B8B" />}
              </Pressable>
            ) : rightIcon}
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#282331",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E2F0",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputWrapperMultiline: {
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#282331",
    paddingVertical: 14,
    minHeight: 48,
  },
  inputMultiline: {
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputDisabled: {
    backgroundColor: "#F5F3F8",
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  iconLeft: {
    marginRight: 12,
  },
  iconRight: {
    marginLeft: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
  },
});