@echo off
setlocal
set APP_HOME=%~dp0

if defined JAVA_HOME (
    set JAVA_EXE=%JAVA_HOME%\bin\java.exe
) else (
    set JAVA_EXE=java.exe
)

if not exist "%JAVA_EXE%" (
    echo JAVA_HOME no apunta a una instalacion valida de Java. 1>&2
    exit /b 1
)

"%JAVA_EXE%" -Xmx64m -Xms64m -classpath "%APP_HOME%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%
