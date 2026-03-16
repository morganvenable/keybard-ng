import React from "react";
import DescriptionBlock from "@/layout/SecondarySidebar/components/DescriptionBlock";

const AboutPanel: React.FC = () => {
    return (
        <div className="space-y-3 pt-0 pb-8 relative h-full max-h-full flex flex-col">
            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                <DescriptionBlock wrapText={false}>
                    <p className="mb-4 text-sm text-slate-500 leading-relaxed">
                        <b>Keybard</b> version 1.0.0
                        <br/><br/>
                        Developed for the <b>Svalboard</b> community.
                    </p>
                </DescriptionBlock>
            </div>
        </div>
    );
};

export default AboutPanel;
