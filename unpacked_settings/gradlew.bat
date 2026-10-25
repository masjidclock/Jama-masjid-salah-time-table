@rem Gradle wrapper start script for Windows
@if "%DEBUG%"=="" @echo off
set DIR=%~dp0
if defined JAVA_HOME (set JAVA_EXE=%JAVA_HOME%\bin\java.exe) else set JAVA_EXE=java.exe
"%JAVA_EXE%" -Xmx64m -Xms64m "-Dorg.gradle.appname=gradlew" -classpath "%DIR%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
