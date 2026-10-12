import React, { useEffect, useState } from 'react';
import { SpotifyPlus, type UIRoot, type SleepTimerUnit } from 'spotifyplus';
import { BottomSheet, Pressable, Text, TextInput, View, createNativeComponent } from 'spotifyplus/react';
import { TimerManager, label, type Request, type Row } from './model';

const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const TimerList = createNativeComponent<{ rows: Row[]; instance: string; refresh: number }>('TimerList', { scriptId: 'com.spotifyplus.sleeptimer' });
const manager = new TimerManager(SpotifyPlus.Platform.SleepTimer, SpotifyPlus.Platform.Storage, openManager, id);

let root: UIRoot | undefined;
let opening = false;

async function openManager() {
    if (opening || root) return;
    opening = true;

    try {
        root = await SpotifyPlus.UI.mount(<Manager onClose={() => { root?.dispose(); root = undefined; }} />);
    } catch (error) {
        console.error('Could not open timer manager', error);
        SpotifyPlus.toast('Could not open the timer manager.');
    } finally { opening = false; }
}

function Manager({ onClose }: { onClose(): void }) {
    const [snapshot, setSnapshot] = useState(() => manager.snapshot());
    const [editor, setEditor] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [instance] = useState(id);

    const act = (request: Omit<Request, 'revision' | 'requestId'>) => {
        try {
            const reply = manager.handle({ ...request, revision: manager.snapshot().revision, requestId: id() });
            setSnapshot(manager.snapshot());
            setError('');

            if ('started' in reply && reply.started) {
                SpotifyPlus.toast(`Sleep timer set for ${label(reply.minutes)}.`);
                onClose();
            }

            return true;
        } catch (error) {
            setSnapshot(manager.snapshot());
            setError(error instanceof Error ? error.message : 'Unable to update timers.');

            return false;
        } finally { setRefresh(value => value + 1); }
    };

    useEffect(() => {
        const handler = (payload: { instance: string; type: 'move' | 'remove'; order?: string[]; key?: string }) => {
            if (payload.instance === instance) act(payload);
        };

        SpotifyPlus.Events.on('sleepTimers.listAction', handler);
        return () => SpotifyPlus.Events.off('sleepTimers.listAction', handler);
    }, [instance]);

    return <>
        <BottomSheet visible draggable style={{ backgroundColor: '#181818', borderRadius: 24 }} onDismiss={onClose} onError={({ message }) => { SpotifyPlus.toast(message); onClose(); }}>
            <SheetContent>
                <SheetHeader title='Manage timers' subtitle='Touch and hold to change the order.' />
                <TimerList rows={snapshot.rows} instance={instance} refresh={refresh} style={{ width: '100%', height: 320, marginTop: 20 }} />

                {error ? <ErrorMessage message={error} /> : null}

                <ActionButton title='Add sleep timer' onPress={() => { setError(''); setEditor(true); }} />
            </SheetContent>
        </BottomSheet>

        {editor && <TimerEditor error={error} onDismiss={() => { setEditor(false); setError(''); }} onSubmit={(duration, unit, save) => {
            if (act({ type: 'submit', duration, unit, save })) {
                setEditor(false);
            }
        }} />}
    </>;
}

function TimerEditor({ error, onDismiss, onSubmit }: { error: string; onDismiss(): void; onSubmit(duration: number, unit: SleepTimerUnit, save: boolean): void; }) {
    const [duration, setDuration] = useState('');
    const [unit, setUnit] = useState<SleepTimerUnit>('minutes');
    const [save, setSave] = useState(false);

    const valid = duration.trim().length > 0 && Number.isFinite(Number(duration)) && Number(duration) > 0;

    return <BottomSheet visible draggable style={{ backgroundColor: '#181818', borderRadius: 24 }} onDismiss={onDismiss} onError={({ message }) => { SpotifyPlus.toast(message); onDismiss(); }}>
        <SheetContent>
            <SheetHeader title='Add sleep timer' subtitle='Choose how long to keep listening.' />
            <Text style={{ color: '#b3b3b3', fontSize: 13, marginTop: 24, marginBottom: 8 }}>DURATION</Text>
            <TextInput value={duration} onChangeText={setDuration} placeholder='30' placeholderTextColor='#777777' keyboardType='decimal-pad' singleLine style={{ color: '#ffffff', fontSize: 24, height: 64, paddingHorizontal: 16, backgroundColor: '#282828', borderRadius: 14 }} />

            <View style={{ flexDirection: 'row', backgroundColor: '#282828', borderRadius: 24, padding: 4, marginTop: 12 }}>
                {(['minutes', 'hours'] as const).map(value => <Pressable key={value} onPress={() => setUnit(value)}
                    style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: unit === value ? '#1ed760' : '#282828' }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: unit === value ? '#121212' : '#b3b3b3' }}>{value === 'minutes' ? 'Minutes' : 'Hours'}</Text>
                </Pressable>)}
            </View>

            <Pressable onPress={() => setSave(value => !value)} accessibilityLabel={`Save to my timers: ${save ? 'on' : 'off'}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#282828', borderRadius: 14, padding: 16, marginTop: 20 }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>Save to my timers</Text>
                    <Text style={{ color: '#b3b3b3', fontSize: 12, marginTop: 4 }}>Keep this duration for next time</Text>
                </View>

                <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 44, height: 26, borderRadius: 13, padding: 2, alignItems: save ? 'flex-end' : 'flex-start', backgroundColor: save ? '#1ed760' : '#666666' }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff' }} />
                    </View>
                </View>
            </Pressable>

            <Text style={{ color: '#b3b3b3', fontSize: 13, marginTop: 16 }}>{save ? 'Your preset will appear in the sleep timer menu.' : 'This timer starts now and will not be saved.'}</Text>

            {error ? <ErrorMessage message={error} /> : null}
            <ActionButton title={save ? 'Save timer' : 'Start sleep timer'} disabled={!valid} onPress={() => onSubmit(Number(duration), unit, save)} />
        </SheetContent>
    </BottomSheet>;
}

function SheetContent({ children }: { children: React.ReactNode }) {
    return (
        <View style={{ width: '100%', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: '#777777', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            {children}
        </View>
    );
}

function SheetHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ffffff' }}>{title}</Text>
                <Text style={{ color: '#b3b3b3', fontSize: 13, marginTop: 6 }}>{subtitle}</Text>
            </View>
        </View>
    );
}

function ActionButton({ title, disabled = false, onPress }: { title: string; disabled?: boolean; onPress(): void }) {
    return (
        <Pressable disabled={disabled} onPress={onPress} style={{ height: 48, borderRadius: 24, backgroundColor: '#1ed760', opacity: disabled ? 0.45 : 1, marginTop: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#121212', fontSize: 15, fontWeight: 'bold' }}>{title}</Text>
        </Pressable>
    );
}

function ErrorMessage({ message }: { message: string }) {
    return <Text style={{ color: '#ff9999', fontSize: 13, marginTop: 12 }}>{message}</Text>;
}
