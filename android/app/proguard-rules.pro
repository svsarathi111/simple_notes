# ProGuard rules for Sticky Notes app

# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep interface com.getcapacitor.** { *; }

# Android support libraries
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Preserve annotations
-keepattributes *Annotation*
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep constructors
-keepclasseswithmembers class * {
    public <init>(...);
}

# Optimization
-optimizationpasses 5
-dontpreverify
-optimizations !code/simplification/arithmetic
