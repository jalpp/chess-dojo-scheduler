import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Text, MD3DarkTheme } from 'react-native-paper';
import { router } from 'expo-router';

import Stack from '../components/Stack';
import Button from '../components/Button';
import { View } from 'react-native';

const theme = {
    ...MD3DarkTheme,
    colors: {
        primary: 'rgb(143, 205, 255)',
        onPrimary: 'rgb(0, 52, 79)',
        primaryContainer: 'rgb(0, 75, 113)',
        onPrimaryContainer: 'rgb(203, 230, 255)',
        secondary: 'rgb(243, 174, 255)',
        onSecondary: 'rgb(79, 21, 94)',
        secondaryContainer: 'rgb(104, 46, 118)',
        onSecondaryContainer: 'rgb(253, 214, 255)',
        tertiary: 'rgb(208, 192, 232)',
        onTertiary: 'rgb(54, 43, 74)',
        tertiaryContainer: 'rgb(77, 65, 98)',
        onTertiaryContainer: 'rgb(235, 220, 255)',
        error: 'rgb(255, 180, 169)',
        onError: 'rgb(105, 0, 2)',
        errorContainer: 'rgb(147, 0, 5)',
        onErrorContainer: 'rgb(255, 218, 213)',
        background: 'rgb(26, 28, 30)',
        onBackground: 'rgb(226, 226, 229)',
        surface: 'rgb(26, 28, 30)',
        onSurface: 'rgb(226, 226, 229)',
        surfaceVariant: 'rgb(65, 71, 77)',
        onSurfaceVariant: 'rgb(193, 199, 206)',
        outline: 'rgb(139, 145, 152)',
        outlineVariant: 'rgb(65, 71, 77)',
        shadow: 'rgb(0, 0, 0)',
        scrim: 'rgb(0, 0, 0)',
        inverseSurface: 'rgb(226, 226, 229)',
        inverseOnSurface: 'rgb(46, 49, 51)',
        inversePrimary: 'rgb(0, 100, 148)',
        elevation: {
            level0: 'transparent',
            level1: 'rgb(32, 37, 41)',
            level2: 'rgb(35, 42, 48)',
            level3: 'rgb(39, 48, 55)',
            level4: 'rgb(40, 49, 57)',
            level5: 'rgb(42, 53, 62)',
        },
        surfaceDisabled: 'rgba(226, 226, 229, 0.12)',
        onSurfaceDisabled: 'rgba(226, 226, 229, 0.38)',
        backdrop: 'rgba(43, 49, 55, 0.4)',
        warning: 'rgb(255, 185, 97)',
        onWarning: 'rgb(71, 42, 0)',
        warningContainer: 'rgb(102, 62, 0)',
        onWarningContainer: 'rgb(255, 221, 185)',
        info: 'rgb(129, 207, 255)',
        onInfo: 'rgb(0, 52, 75)',
        infoContainer: 'rgb(0, 76, 107)',
        onInfoContainer: 'rgb(198, 231, 255)',
        success: 'rgb(131, 218, 133)',
        onSuccess: 'rgb(0, 57, 14)',
        successContainer: 'rgb(0, 83, 24)',
        onSuccessContainer: 'rgb(159, 247, 159)',
    },
};

export default function App() {
    const onSignUp = () => {
        router.push('/settings/');
    };

    const onSignIn = () => {
        router.push('/settings/');
    };

    return (
        <PaperProvider theme={theme}>
            <View style={{ backgroundColor: theme.colors.background }}>
                <Stack
                    spacing={4}
                    style={{
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 8,
                    }}
                >
                    <Text variant='displayMedium' style={{ textAlign: 'center' }}>
                        ChessDojo Scoreboard
                    </Text>

                    <Text variant='headlineSmall' style={{ textAlign: 'center' }}>
                        The ChessDojo{' '}
                        <Text style={{ color: '#F7941F' }}>Training Program</Text> offers
                        structured training plans for all levels 0-2500, along with an
                        active and supportive community
                    </Text>

                    <Stack
                        direction='row'
                        spacing={3}
                        style={{ justifyContent: 'center' }}
                    >
                        <Button
                            mode='contained'
                            labelStyle={{ fontWeight: 'bold' }}
                            onPress={onSignUp}
                        >
                            Sign Up for Free
                        </Button>

                        <Button
                            mode='outlined'
                            labelStyle={{ fontWeight: 'bold' }}
                            onPress={onSignIn}
                        >
                            Sign In
                        </Button>
                    </Stack>

                    <StatusBar style='auto' />
                </Stack>
            </View>
        </PaperProvider>
    );
}
