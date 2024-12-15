import React, { useState, useEffect } from 'react';
import { Plus, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './TimeTable.css';

const TimeTableScheduler = () => {
    const [teachers, setTeachers] = useState([]);
    const [newTeacher, setNewTeacher] = useState({
        name: '',
        subjects: [
            {
                subject: '',
                classes: [],
                streams: []
            }
        ],
        availableDays: [],
    });

    const addSubject = () => {
        setNewTeacher(prevTeacher => ({
            ...prevTeacher,
            subjects: [
                ...prevTeacher.subjects,
                { subject: '', classes: [], streams: [] }
            ]
        }));
    };

    const removeSubject = (index) => {
        setNewTeacher(prevTeacher => {
            const newSubjects = [...prevTeacher.subjects];
            newSubjects.splice(index, 1);
            return { ...prevTeacher, subjects: newSubjects };
        });
    };

    const handleSubjectChange = (index, field, value) => {
        setNewTeacher(prevTeacher => {
            const newSubjects = prevTeacher.subjects.map((subject, i) => {
                if (i === index) {
                    return { ...subject, [field]: value };
                }
                return subject;
            });
            return { ...prevTeacher, subjects: newSubjects };
        });
    };

    const [schedule, setSchedule] = useState({});
    const [selectedClass, setSelectedClass] = useState('S5A');
    const [selectedDays, setSelectedDays] = useState([]);
    const [loading, setLoading] = useState(false);

    const subjects = [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
        'History', 'Geography', 'P.E', 'ICT', 'ENT', 'Arabic',
        'Kiswahili', 'Luganda', 'Literature', 'ART', 'Theology', 'General Paper', 'Economics', 'SubMath', 'Islam', 'Divinity', 'Agriculture', 'CRE'
    ];

    useEffect(() => {
        const savedTeachers = localStorage.getItem('schoolTeachers');
        if (savedTeachers) {
            setTeachers(JSON.parse(savedTeachers));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('schoolTeachers', JSON.stringify(teachers));
    }, [teachers]);

    const regularTimePeriods = [
        { id: 1, time: '7:20 AM - 8:40 AM' },
        { id: 2, time: '8:40 AM - 10:00 AM' },
        { id: 3, time: '10:20 AM - 11:40 AM' },
        { id: 4, time: '11:40 AM - 1:00 PM' },
        { id: 5, time: '2:00 PM - 3:20 PM' },
        { id: 6, time: '3:20 PM - 4:40 PM' }
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const classes = [
        ...['S1', 'S2'].flatMap(level => ['A', 'B', 'C'].map(stream => `${level}${stream}`)),
        ...['S3', 'S4'].flatMap(level => ['A', 'B', 'C'].map(stream => `${level}${stream}`)),
        ...['S5', 'S6'].flatMap(level => ['A', 'B'].map(stream => `${level}${stream}`))
    ];

    const getTimePeriodsForClass = (className) => {
        return regularTimePeriods;
    };

    const handleDayToggle = (day) => {
        setSelectedDays(prevDays => {
            if (prevDays.includes(day)) {
                return prevDays.filter(d => d !== day);
            } else {
                return [...prevDays, day].sort((a, b) => days.indexOf(a) - days.indexOf(b));
            }
        });
    };

    const addTeacher = () => {
        if (!newTeacher.name) {
            alert('Please enter a teacher name.');
            return;
        }
        if (newTeacher.subjects.some(subject => !subject.subject)) {
            alert('Please select a subject for each entry.');
            return;
        }
        if (selectedDays.length === 0) {
            alert('Please select at least one available day.');
            return;
        }
        if (newTeacher.subjects.some(subject => subject.classes.some(c => c === 'S5' || c === 'S6') && subject.streams.length === 0)) {
            alert('Please select at least one stream for S5 and S6 classes.');
            return;
        }

        const existingTeacher = teachers.find(teacher => teacher.name === newTeacher.name);
        if (existingTeacher) {
            setTeachers(teachers.map(teacher => {
                if (teacher.name === newTeacher.name) {
                    const updatedSubjects = teacher.subjects.map(teacherSubject => {
                        const newSubject = newTeacher.subjects.find(newSubject => newSubject.subject === teacherSubject.subject);
                        if (newSubject) {
                            return {
                                ...teacherSubject,
                                classes: [...teacherSubject.classes, ...newSubject.classes],
                                streams: [...teacherSubject.streams, ...newSubject.streams]
                            };
                        }
                        return teacherSubject;
                    });
                    return {
                        ...teacher,
                        subjects: [...updatedSubjects, ...newTeacher.subjects.filter(newSubject => !teacher.subjects.find(teacherSubject => teacherSubject.subject === newSubject.subject))],
                        availableDays: [...new Set([...teacher.availableDays, ...selectedDays])]
                    };
                }
                return teacher;
            }));
        } else {
            setTeachers([
                ...teachers,
                {
                    ...newTeacher,
                    availableDays: [...selectedDays],
                    periodsAssigned: 0,
                    id: teachers.length + 1
                }
            ]);
        }

        setNewTeacher({
            name: '',
            subjects: [
                {
                    subject: '',
                    classes: [],
                    streams: []
                }
            ],
            availableDays: []
        });
        setSelectedDays([]);
    };

    const removeTeacher = (index) => {
        const updatedTeachers = teachers.filter((_, i) => i !== index);
        setTeachers(updatedTeachers);
    };

    const generateSchedule = () => {
        setLoading(true);
        const newSchedule = {};
        let teacherAssignments = teachers.map(teacher => ({
            ...teacher,
            periodsAssigned: 0,
            dailyAssignments: {},
            dailyClassAssignments: {},
            quadralsAssigned: 0,
            doublesAssigned: 0
        }));

        const compulsorySubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography'];
        const optionalSubjects = subjects.filter(subject => !compulsorySubjects.includes(subject) && subject !== 'General Paper' && subject !== 'SubMath');
        const peSubjects = ['P.E'];
        const scienceSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology'];
        const historySubjects = ['History', 'Geography'];

        const scienceQuadralsPerWeek = 3;
        const scienceDoublesPerWeek = 2;
        const artsQuadralsPerWeek = 2;
        const artsDoublesPerWeek = 2;
        const minDoublesPerWeek = 3;
        const subsidiaryQuadralsPerWeek = 2;
        const subsidiaryPeriodsPerWeek = 1;

        const simultaneousSubjects = {
            'Islam': ['CRE'],
            'ENT': ['Luganda', 'Arabic', 'ICT', 'ART', 'Kiswahili']
        };

        classes.forEach(className => {
            const timePeriods = getTimePeriodsForClass(className);
            const totalPeriodsPerWeek = days.length * timePeriods.length;
            const targetPeriodsPerTeacher = Math.floor(totalPeriodsPerWeek / teachers.length);

            newSchedule[className] = {};
            days.forEach(day => {
                newSchedule[className][day] = {};
                timePeriods.forEach(period => {
                    newSchedule[className][day][period.id] = {
                        teacher: 'Unassigned',
                        subject: '-',
                        time: period.time
                    };
                });
            });

            const classLevel = className.substring(0, 2);
            const stream = className.substring(2);

            days.forEach(day => {
                timePeriods.forEach(period => {
                    let availableTeachers = teacherAssignments.filter(teacher => {
                        if (teacher.classes.includes(classLevel) &&
                            (classLevel !== 'S5' && classLevel !== 'S6' || teacher.streams.includes(stream)) &&
                            teacher.periodsAssigned < targetPeriodsPerTeacher * 1.2 &&
                            (!teacher.dailyAssignments[day] || teacher.dailyAssignments[day] < 4) &&
                            teacher.availableDays.includes(day) &&
                            (!teacher.dailyClassAssignments[day] || !teacher.dailyClassAssignments[day].includes(className))) {
                            return teacher.subjects.some(subject => {
                                if (compulsorySubjects.includes(subject)) {
                                    // Ensure compulsory subjects do not collide
                                    if (!newSchedule[className][day][period.id].subject || compulsorySubjects.includes(newSchedule[className][day][period.id].subject)) {
                                        return true;
                                    }
                                } else if (optionalSubjects.includes(subject)) {
                                    // Ensure optional subjects can collide
                                    if (!newSchedule[className][day][period.id].subject || optionalSubjects.includes(newSchedule[className][day][period.id].subject)) {
                                        return true;
                                    }
                                } else if (peSubjects.includes(subject)) {
                                    // Schedule PE in the evening hours
                                    if (period.id >= 5) {
                                        return true;
                                    }
                                } else if (scienceSubjects.includes(subject)) {
                                    // Give science subjects priority in the morning and after the morning break
                                    if (period.id % 2 === 1) {
                                        return true;
                                    }
                                } else if (historySubjects.includes(subject)) {
                                    // Schedule History after lunch or after the morning break
                                    if (period.id >= 3) {
                                        return true;
                                    }
                                } else if (subject === 'General Paper' && (classLevel === 'S5' || classLevel === 'S6')) {
                                    // Ensure General Paper is compulsory and has a quadral
                                    if (teacher.quadralsAssigned < 1 && period.id % 2 === 1 && period.id < 6) {
                                        return true;
                                    }
                                } else if (subject === 'SubMath' || subject === 'ICT') {
                                    // Ensure SubMath and ICT are scheduled at the same time and have two quadrals and one period
                                    if (teacher.quadralsAssigned < subsidiaryQuadralsPerWeek && period.id % 2 === 1 && period.id < 6) {
                                        return true;
                                    } else if (teacher.periodsAssigned < subsidiaryPeriodsPerWeek && period.id % 2 === 1) {
                                        return true;
                                    }
                                } else if (subject in simultaneousSubjects) {
                                    // Ensure simultaneous subjects are scheduled at the same time
                                    if (teacher.periodsAssigned < targetPeriodsPerTeacher * 0.7) {
                                        return true;
                                    }
                                }
                                return true;
                            });
                        }
                        return false;
                    }).sort((a, b) => {
                        const aLoad = a.periodsAssigned + (a.dailyAssignments[day] || 0);
                        const bLoad = b.periodsAssigned + (b.dailyAssignments[day] || 0);
                        return aLoad - bLoad;
                    });

                    if (availableTeachers.length > 0) {
                        const selectedTeacher = availableTeachers[0];
                        const teacherIndex = teacherAssignments.findIndex(t => t.id === selectedTeacher.id);

                        const selectedSubject = selectedTeacher.subjects.find(subject => {
                            if (compulsorySubjects.includes(subject)) {
                                return compulsorySubjects.includes(newSchedule[className][day][period.id].subject);
                            } else if (optionalSubjects.includes(subject)) {
                                return optionalSubjects.includes(newSchedule[className][day][period.id].subject);
                            } else if (peSubjects.includes(subject)) {
                                return period.id >= 5;
                            } else if (scienceSubjects.includes(subject)) {
                                return period.id % 2 === 1;
                            } else if (historySubjects.includes(subject)) {
                                return period.id >= 3;
                            } else if (subject === 'General Paper' && (classLevel === 'S5' || classLevel === 'S6')) {
                                return selectedTeacher.quadralsAssigned < 1 && period.id % 2 === 1 && period.id < 6;
                            } else if (subject === 'SubMath' || subject === 'ICT') {
                                return (selectedTeacher.quadralsAssigned < subsidiaryQuadralsPerWeek && period.id % 2 === 1 && period.id < 6) ||
                                    (selectedTeacher.periodsAssigned < subsidiaryPeriodsPerWeek && period.id % 2 === 1);
                            } else if (subject in simultaneousSubjects) {
                                return selectedTeacher.periodsAssigned < targetPeriodsPerTeacher * 0.7;
                            }
                            return true;
                        });

                        teacherAssignments[teacherIndex] = {
                            ...selectedTeacher,
                            periodsAssigned: selectedTeacher.periodsAssigned + 1,
                            dailyAssignments: {
                                ...selectedTeacher.dailyAssignments,
                                [day]: (selectedTeacher.dailyAssignments[day] || 0) + 1
                            },
                            dailyClassAssignments: {
                                ...selectedTeacher.dailyClassAssignments,
                                [day]: [...(selectedTeacher.dailyClassAssignments[day] || []), className]
                            },
                            quadralsAssigned: period.id % 2 === 1 && period.id < 6 ? selectedTeacher.quadralsAssigned + 1 : selectedTeacher.quadralsAssigned,
                            doublesAssigned: period.id % 2 === 1 ? selectedTeacher.doublesAssigned + 1 : selectedTeacher.doublesAssigned
                        };

                        newSchedule[className][day][period.id] = {
                            teacher: selectedTeacher.name,
                            subject: selectedSubject,
                            time: period.time
                        };

                        // Handle simultaneous subjects for S5 and S6
                        if (classLevel === 'S5' || classLevel === 'S6') {
                            const simultaneous = simultaneousSubjects[selectedSubject];
                            if (simultaneous) {
                                simultaneous.forEach(simultaneousSubject => {
                                    const simultaneousTeacher = teacherAssignments.find(t => t.subjects.includes(simultaneousSubject) && t.classes.includes(classLevel) && t.streams.includes(stream));
                                    if (simultaneousTeacher) {
                                        const simultaneousTeacherIndex = teacherAssignments.findIndex(t => t.id === simultaneousTeacher.id);
                                        teacherAssignments[simultaneousTeacherIndex] = {
                                            ...simultaneousTeacher,
                                            periodsAssigned: simultaneousTeacher.periodsAssigned + 1,
                                            dailyAssignments: {
                                                ...simultaneousTeacher.dailyAssignments,
                                                [day]: (simultaneousTeacher.dailyAssignments[day] || 0) + 1
                                            },
                                            dailyClassAssignments: {
                                                ...simultaneousTeacher.dailyClassAssignments,
                                                [day]: [...(simultaneousTeacher.dailyClassAssignments[day] || []), className]
                                            },
                                            quadralsAssigned: period.id % 2 === 1 && period.id < 6 ? simultaneousTeacher.quadralsAssigned + 1 : simultaneousTeacher.quadralsAssigned,
                                            doublesAssigned: period.id % 2 === 1 ? simultaneousTeacher.doublesAssigned + 1 : simultaneousTeacher.doublesAssigned
                                        };
                                        newSchedule[className][day][period.id] = {
                                            teacher: simultaneousTeacher.name,
                                            subject: simultaneousSubject,
                                            time: period.time
                                        };
                                    }
                                });
                            }
                        }

                        // Handle General Paper in both streams
                        if (selectedSubject === 'General Paper' && (classLevel === 'S5' || classLevel === 'S6')) {
                            const otherStream = stream === 'A' ? 'B' : 'A';
                            const otherClassName = `${classLevel}${otherStream}`;
                            newSchedule[otherClassName][day][period.id] = {
                                teacher: selectedTeacher.name,
                                subject: selectedSubject,
                                time: period.time
                            };
                        }

                        // Handle SubMath and ICT at the same time in both streams
                        if (selectedSubject === 'SubMath' || selectedSubject === 'ICT') {
                            const otherSubject = selectedSubject === 'SubMath' ? 'ICT' : 'SubMath';
                            const otherStream = stream === 'A' ? 'B' : 'A';
                            const otherClassName = `${classLevel}${otherStream}`;
                            newSchedule[otherClassName][day][period.id] = {
                                teacher: selectedTeacher.name,
                                subject: otherSubject,
                                time: period.time
                            };
                        }
                    }
                });
            });
        });

        setTeachers(teachers.map(teacher => {
            const updatedTeacher = teacherAssignments.find(t => t.id === teacher.id);
            return {
                ...teacher,
                periodsAssigned: updatedTeacher.periodsAssigned
            };
        }));
        setSchedule(newSchedule);
        setLoading(false);
        alert('Schedule generated successfully!');
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const timePeriods = getTimePeriodsForClass(selectedClass);

        doc.setProperties({
            title: `${selectedClass} - Weekly Schedule`,
            subject: 'School Timetable',
            author: 'Kinaawa High School'
        });

        doc.setFontSize(18);
        doc.setTextColor(26, 71, 42);
        doc.text('KINAAWA HIGH SCHOOL', 148, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text('KAWEMPE CAMPUS', 148, 28, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(102, 102, 102);
        doc.text('P.O. Box 9093,', 15, 35);
        doc.text('Kampala-Uganda', 15, 40);
        doc.text('Bombo Road - Kawempe Ttula', 15, 45);

        doc.text('Tel:+256(0)772 431975', 230, 35, { align: 'right' });
        doc.text('+256(0)759 137103', 230, 40, { align: 'right' });

        doc.text('E-mail: kinaawa kawempe@gmail.com', 15, 50);

        doc.setDrawColor(26, 71, 42);
        doc.line(15, 52, 280, 52);

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Class ${selectedClass} - Weekly Schedule`, 15, 65);

        const tableData = timePeriods.map(period => {
            return [
                period.time,
                ...days.map(day => {
                    const slot = schedule[selectedClass][day][period.id];
                    return `${slot.teacher}\n${slot.subject}`;
                })
            ];
        });

        const headers = ['Time/Day', ...days];

        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 65,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: 40,
                lineWidth: 0.1,
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [26, 71, 42],
                textColor: 255,
                fontSize: 14, // Adjusted font size for header
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 'auto' }
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            theme: 'grid'
        });

        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const today = new Date().toLocaleDateString();
            doc.text(`Generated on: ${today}`, 15, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        }

        doc.save(`${selectedClass}_schedule.pdf`);
        alert('PDF exported successfully!');
    };

    return (
        <div className="timetable-container">
            <div className="management-card">
                <div className="management-header">
                    <div className="header-content">
                        <h2 className="header-title">Teacher Management (Total: {teachers.length})</h2>
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure about clearing all teachers?')) {
                                    setTeachers([]);
                                    localStorage.removeItem('schoolTeachers');
                                }
                            }}
                            className="clear-button"
                        >
                            Clear All Teachers
                        </button>
                    </div>
                </div>

                <div className="input-container">
                    <div className="input-row">
                        <div className="input-group">
                            <label htmlFor="teacherName">Teacher Name</label>
                            <input
                                type="text"
                                id="teacherName"
                                placeholder="Teacher Name"
                                value={newTeacher.name}
                                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        {newTeacher.subjects.map((subject, index) => (
                            <div key={index} className="subject-entry">
                                <div className="input-group">
                                    <label htmlFor={`subject-${index}`}>Subject</label>
                                    <select
                                        id={`subject-${index}`}
                                        value={subject.subject}
                                        onChange={(e) => handleSubjectChange(index, 'subject', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor={`classes-${index}`}>Classes</label>
                                    <select
                                        id={`classes-${index}`}
                                        multiple
                                        value={subject.classes}
                                        onChange={(e) => handleSubjectChange(index, 'classes', Array.from(e.target.selectedOptions, option => option.value))}
                                        className="input-field"
                                    >
                                        {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(className => (
                                            <option key={className} value={className}>{className}</option>
                                        ))}
                                    </select>
                                </div>
                                {subject.classes.some(c => c === 'S5' || c === 'S6') && (
                                    <div className="input-group">
                                        <label htmlFor={`streams-${index}`}>Streams</label>
                                        <select
                                            id={`streams-${index}`}
                                            multiple
                                            value={subject.streams}
                                            onChange={(e) => handleSubjectChange(index, 'streams', Array.from(e.target.selectedOptions, option => option.value))}
                                            className="input-field"
                                        >
                                            <option value="A">Arts A</option>
                                            <option value="B">Sciences B</option>
                                        </select>
                                    </div>
                                )}
                                <button onClick={() => removeSubject(index)} className="remove-button">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={addSubject} className="add-subject-button">
                            <Plus className="w-4 h-4" />
                            Add Subject
                        </button>
                        <div className="days-toggle-container">
                            {days.map(day => (
                                <button
                                    key={day}
                                    onClick={() => handleDayToggle(day)}
                                    className={`day-toggle ${selectedDays.includes(day) ? 'day-selected' : ''}`}
                                >
                                    {day.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={addTeacher}
                            disabled={
                                !newTeacher.name ||
                                newTeacher.subjects.some(subject => !subject.subject) ||
                                selectedDays.length === 0 ||
                                newTeacher.subjects.some(subject => subject.classes.some(c => c === 'S5' || c === 'S6') && subject.streams.length === 0)
                            }
                            className="add-button"
                        >
                            <Plus className="w-4 h-4" />
                            Add Teacher
                        </button>
                    </div>
                </div>

                <div className="teacher-list">
                    {teachers.map((teacher, index) => (
                        <div key={index} className="teacher-card">
                            <div className="teacher-info">
                                <div className="teacher-name">{teacher.name}</div>
                                <div className="teacher-subject">{teacher.subjects.map(subject => subject.subject).join(', ')}</div>
                                <div className="teacher-classes">
                                    Classes: {teacher.subjects.reduce((acc, subject) => {
                                        acc.push(...subject.classes);
                                        return acc;
                                    }, []).join(', ')}
                                    {teacher.subjects.some(subject => subject.classes.some(c => c === 'S5' || c === 'S6')) && 
                                        ` ( ${teacher.subjects.reduce((acc, subject) => {
                                            if (subject.classes.some(c => c === 'S5' || c === 'S6')) {
                                                acc.push(...subject.streams);
                                            }
                                            return acc;
                                        }, []).join(', ')})`
                                    }
                                </div>
                                <div className="teacher-periods">Available: {teacher.availableDays.join(', ')}</div>
                                <div className="teacher-periods">Periods: {teacher.periodsAssigned}</div>
                            </div>
                            <button
                                onClick={() => removeTeacher(index)}
                                className="remove-button"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {teachers.length > 0 && (
                    <button
                        onClick={generateSchedule}
                        className="generate-button"
                    >
                        Generate Weekly Schedule
                    </button>
                )}
            </div>

            {Object.keys(schedule).length > 0 && (
                <div className="schedule-card">
                    <div className="schedule-header">
                        <h2 className="header-title">Weekly Schedule</h2>
                        <div className="class-buttons">
                            {classes.map(className => (
                                <button
                                    key={className}
                                    onClick={() => setSelectedClass(className)}
                                    className={`class-button ${
                                        selectedClass === className 
                                            ? 'class-button-active' 
                                            : 'class-button-inactive'
                                    }`}
                                >
                                    {className}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="schedule-table-container">
                        <table className="schedule-table">
                            <thead>
                                <tr>
                                    <th className="table-header">Time/Day</th>
                                    {days.map(day => (
                                        <th key={day} className="table-header">{day}</th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {getTimePeriodsForClass(selectedClass).map(period => (
                                    <tr key={period.id}>
                                        <td className="table-cell time-cell">{period.time}</td>
                                        {days.map(day => (
                                            <td key={day} className="table-cell">
                                                {schedule[selectedClass]?.[day]?.[period.id]?.teacher && (
                                                    <div className="period-info">
                                                        <div className="subject-name">
                                                            {schedule[selectedClass][day][period.id].subject}
                                                        </div>
                                                        <div className="teacher">
                                                            {schedule[selectedClass][day][period.id].teacher}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={exportToPDF}
                            className="add-button"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTableScheduler;
