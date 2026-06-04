import streamlit as st
import sqlite3
import bcrypt
import re
from datetime import datetime

DB_NAME = "typeforge.db"


def get_connection():
    return sqlite3.connect(DB_NAME, check_same_thread=False)


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        wpm REAL,
        accuracy REAL,
        duration INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()


def create_user(username, password):
    conn = get_connection()
    cur = conn.cursor()

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    try:
        cur.execute(
            "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
            (
                username,
                hashed.decode(),
                datetime.utcnow().isoformat()
            )
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def authenticate(username, password):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT id,password_hash FROM users WHERE username=?",
        (username,)
    )

    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    user_id = row[0]
    stored_hash = row[1]

    if bcrypt.checkpw(
        password.encode(),
        stored_hash.encode()
    ):
        return user_id

    return None


init_db()

st.set_page_config(
    page_title="TypeForge AI",
    page_icon="⌨️",
    layout="wide"
)

if "user_id" not in st.session_state:
    st.session_state.user_id = None

st.title("⌨️ TypeForge AI")

menu = st.sidebar.radio(
    "Navigation",
    ["Login", "Register"]
)

if st.session_state.user_id:

    st.success("Logged in successfully")

    if st.button("Logout"):
        st.session_state.user_id = None
        st.rerun()

else:

    if menu == "Register":

        st.subheader("Create Account")

        username = st.text_input("Username")
        password = st.text_input(
            "Password",
            type="password"
        )

        if st.button("Register"):

            if len(username) < 3:
                st.error("Username too short")

            elif len(password) < 6:
                st.error("Password too short")

            else:

                if create_user(
                    username,
                    password
                ):
                    st.success(
                        "Account created successfully"
                    )
                else:
                    st.error(
                        "Username already exists"
                    )

    else:

        st.subheader("Login")

        username = st.text_input(
            "Username"
        )

        password = st.text_input(
            "Password",
            type="password"
        )

        if st.button("Login"):

            user_id = authenticate(
                username,
                password
            )

            if user_id:
                st.session_state.user_id = user_id
                st.rerun()
            else:
                st.error(
                    "Invalid credentials"
                )