from fpdf import FPDF
import datetime
import os

class ReportGenerator:
    def __init__(self):
        pass

    def generate_pdf(self, data, decision, explanation):
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Arial", 'B', 20)
        pdf.cell(190, 15, "MedAssist v2 - Clinical Triage Report", ln=True, align='C')
        pdf.set_font("Arial", '', 10)
        pdf.cell(190, 10, f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='C')
        pdf.ln(10)
        
        # Urgency Section
        urgency = decision['final_urgency']
        pdf.set_font("Arial", 'B', 14)
        pdf.set_fill_color(240, 240, 240)
        if urgency == "High":
            pdf.set_text_color(200, 0, 0)
        elif urgency == "Moderate":
            pdf.set_text_color(200, 150, 0)
        else:
            pdf.set_text_color(0, 150, 0)
            
        pdf.cell(190, 12, f"URGENCY LEVEL: {urgency}", ln=True, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(5)
        
        # Patient Data
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "Assessment Summary", ln=True)
        pdf.set_font("Arial", '', 10)
        
        features = [
            ("Primary Symptom", data.get('primary_symptom')),
            ("Severity Score", f"{data.get('severity_score')}/10"),
            ("Duration", data.get('duration_category')),
            ("Age Group", data.get('age_group')),
            ("Frequency", data.get('frequency')),
            ("Breathlessness", data.get('breathlessness_level')),
            ("Vomiting Severity", data.get('vomiting_severity')),
            ("Fever Level", data.get('fever_level')),
            ("Pain Type", data.get('pain_type'))
        ]
        
        for label, val in features:
            pdf.set_font("Arial", 'B', 10)
            pdf.cell(50, 8, f"{label}:", border=0)
            pdf.set_font("Arial", '', 10)
            pdf.cell(140, 8, f"{val}", border=0, ln=True)
            
        pdf.ln(5)
        
        # Logic Section
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "Clinical Logic Details", ln=True)
        pdf.set_font("Arial", 'I', 10)
        pdf.multi_cell(180, 8, f"Rule Matched: {decision['rule_output']['matching_rule']}")
        pdf.set_font("Arial", '', 10)
        pdf.multi_cell(180, 8, f"Logic: {decision['rule_output']['logic']}")
        pdf.ln(5)
        
        # AI Explanation
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "AI Generated Explanation", ln=True)
        pdf.set_font("Arial", '', 10)
        pdf.multi_cell(180, 8, explanation['narrative'])
        pdf.ln(5)

        # Safety Advice
        pdf.set_font("Arial", 'B', 12)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(190, 10, "First Aid & Safety Advice", ln=True, fill=True)
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(30, 8, "First Aid:")
        pdf.set_font("Arial", '', 10)
        pdf.multi_cell(150, 8, explanation['first_aid'])
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(30, 8, "Medicine Info:")
        pdf.set_font("Arial", '', 10)
        pdf.multi_cell(150, 8, explanation['medicine_info'])
        pdf.ln(5)
        
        # Recommendation
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(190, 10, "Recommended Next Steps", ln=True)
        pdf.set_font("Arial", 'B', 11)
        pdf.multi_cell(180, 8, explanation['recommendation'])
        
        # Footer
        pdf.ln(20)
        pdf.set_font("Arial", 'I', 8)
        pdf.multi_cell(180, 5, "DISCLAIMER: MedAssist v2 is an AI-assisted triage tool. It is NOT a diagnosis. This report is intended for informational purposes to support clinical decision-making. If you feel this is an emergency, seek professional medical help immediately.")

        # Ensure reports directory exists
        if not os.path.exists("reports"):
            os.makedirs("reports")
            
        filename = f"reports/report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        pdf.output(filename)
        return filename
