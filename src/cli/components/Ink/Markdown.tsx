import React, { useEffect } from 'react';
import { Text } from 'ink';
import TerminalRenderer, { TerminalRendererOptions } from 'marked-terminal';
import { marked, parse } from 'marked';

export type Props = TerminalRendererOptions & {
    children: string;
};

export default function Markdown({ children, ...options }: Props) {
    const [parsedText, setParsedText] = React.useState<string | null>(null);
    
    useEffect(() => {
        marked.setOptions({
            renderer: new TerminalRenderer(options) as any
        });
        
        const runParseText = async () => {
            const parsed = await parse(children);
            setParsedText(parsed.trim());
        }
        runParseText();
    }, [children, options]);

    return <Text>{parsedText}</Text>;
}