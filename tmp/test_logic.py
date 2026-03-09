from datetime import date, timedelta
from django.utils import timezone

def test_logic():
    today = date(2026, 3, 9)
    print(f"Today: {today}")
    
    milestones = [
        {'id': 1, 'milestone_no': 'M1', 'due_date': date(2026, 3, 4)},
        {'id': 2, 'milestone_no': 'M2', 'due_date': date(2026, 3, 7)},
        {'id': 3, 'milestone_no': 'M3', 'due_date': date(2026, 3, 15)},
    ]
    
    yet_to_due = []
    due_1_5days = []
    due = []
    
    for m in milestones:
        due_date = m['due_date']
        if due_date > today:
            yet_to_due.append(m)
        elif due_date > today - timedelta(days=5):
            due_1_5days.append(m)
        else:
            due.append(m)
            
    print("Yet to Due:", [m['milestone_no'] for m in yet_to_due])
    print("Due 1-5 Days:", [m['milestone_no'] for m in due_1_5days])
    print("Due:", [m['milestone_no'] for m in due])

if __name__ == "__main__":
    test_logic()
